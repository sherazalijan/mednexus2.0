import os
import uuid
from typing import Optional
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, File, Form, UploadFile
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime
from app.database.base import get_db
from app.core.audit import log_audit
from app.core.email import send_email
from app.core.rate_limit import limiter
from app.core.security import (
    CurrentUser,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    generate_opaque_token,
    get_current_user,
    hash_password,
    hash_token,
    verify_password,
    validate_password_strength,
)
from app.models.schemas import LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
PASSWORD_RESET_EXPIRE_MINUTES = 30


# ---------------------------------------------------------------------------
# Request/response shapes specific to this file
# ---------------------------------------------------------------------------
class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    role: str
    new_device: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class PublicRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    degree: Optional[str] = "MBBS"
    academic_year: Optional[str] = "1st Year"
    plan_name: Optional[str] = "Monthly"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _issue_refresh_token(db: Session, user_id: int) -> str:
    raw_token = generate_opaque_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db.execute(
        text("""
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES (:user_id, :token_hash, :expires_at)
        """),
        {"user_id": user_id, "token_hash": hash_token(raw_token), "expires_at": expires_at},
    )
    return raw_token


def _record_login(db: Session, user_id: int, request: Request) -> bool:
    """Returns True if this looks like a new device/location for this user."""
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")

    seen = db.execute(
        text("""
            SELECT 1 FROM login_history
            WHERE user_id = :user_id AND ip_address = :ip AND user_agent = :ua
            LIMIT 1
        """),
        {"user_id": user_id, "ip": ip, "ua": user_agent},
    ).fetchone()

    is_new_device = seen is None

    db.execute(
        text("""
            INSERT INTO login_history (user_id, ip_address, user_agent, is_new_device)
            VALUES (:user_id, :ip, :ua, :is_new)
        """),
        {"user_id": user_id, "ip": ip, "ua": user_agent, "is_new": is_new_device},
    )
    return is_new_device


# ---------------------------------------------------------------------------
# Public Registration & Payment Proof Upload
# ---------------------------------------------------------------------------
UPLOAD_DIR = os.getenv("PAYMENT_PROOF_UPLOAD_DIR", "uploads/payment_proofs")


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
async def register_user(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    degree: str = Form(default="MBBS"),
    academic_year: str = Form(default="1st Year"),
    plan_name: str = Form(default="Monthly"),
    note: str = Form(default=""),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    validate_password_strength(password)

    existing = db.execute(
        text("SELECT id, account_status FROM users WHERE email = :email"),
        {"email": email},
    ).fetchone()

    user_id = None
    if existing:
        if existing.account_status == "pending":
            user_id = existing.id
        else:
            raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")
    else:
        password_h = hash_password(password)
        user_row = db.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash, role, account_status)
                VALUES (:full_name, :email, :password_hash, 'student', 'pending')
                RETURNING id, full_name, email, role, account_status
            """),
            {"full_name": full_name, "email": email, "password_hash": password_h},
        ).fetchone()
        user_id = user_row.id
        log_audit(db, user_id, "user_registered_pending", "user", user_id)

    proof_created = False
    if file and file.filename:
        raw = await file.read()
        if raw and len(raw) <= 5 * 1024 * 1024:
            user_dir = os.path.join(UPLOAD_DIR, str(user_id))
            os.makedirs(user_dir, exist_ok=True)
            ext = os.path.splitext(file.filename or "")[1][:10] or ".jpg"
            stored_name = f"{uuid.uuid4().hex}{ext}"
            file_dest = os.path.join(user_dir, stored_name)
            with open(file_dest, "wb") as f:
                f.write(raw)
            relative_path = os.path.join(str(user_id), stored_name)

            db.execute(
                text("""
                    INSERT INTO payment_proofs
                        (user_id, file_path, original_filename, plan_name, note, status)
                    VALUES (:uid, :file_path, :original_filename, :plan_name, :note, 'pending')
                """),
                {
                    "uid": user_id,
                    "file_path": relative_path,
                    "original_filename": file.filename,
                    "plan_name": plan_name,
                    "note": note,
                },
            )
            proof_created = True

    db.commit()

    return {
        "success": True,
        "message": "Registration & payment proof submitted successfully. Pending admin approval.",
        "user_id": user_id,
        "proof_submitted": proof_created,
    }


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenPair)
# CHANGE (MVP reliability — requested): this limiter is keyed by raw client
# IP (app/core/rate_limit.py::get_remote_address). On any shared network —
# a school/hospital wifi, a corporate NAT, a university library — every
# student behind that IP shares one bucket. 5 login attempts per minute
# *total* is trivial for a handful of students logging in around the same
# time to exhaust, and everyone else on that IP gets blocked until the
# window rolls over. That's the "login only works through VPN" symptom:
# VPN just hands the user a fresh, unshared IP. Per-account brute-force
# protection is unaffected by this change — it's handled below by
# MAX_FAILED_ATTEMPTS/LOCKOUT_MINUTES, which locks the specific account
# after 5 *wrong-password* attempts regardless of IP. Raising the IP-level
# limit just stops it from being a false-positive trap for shared networks.
@limiter.limit("30/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("""
            SELECT id, full_name, email, password_hash, role, account_status,
                   failed_login_attempts, locked_until
            FROM users
            WHERE email = :email
        """),
        {"email": data.email},
    ).fetchone()

    # Same error message whether the email doesn't exist or the password is
    # wrong — don't let login responses double as an account-enumeration
    # oracle.
    invalid_creds = HTTPException(status_code=401, detail="Invalid credentials")

    if not user:
        raise invalid_creds

    if user.locked_until:
       raise HTTPException(
        status_code=423,
        detail="Account temporarily locked."
    )
    if not verify_password(data.password, user.password_hash):
        attempts = user.failed_login_attempts + 1
        lock_fields = {"attempts": attempts, "locked_until": None}
        if attempts >= MAX_FAILED_ATTEMPTS:
            lock_fields["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
            lock_fields["attempts"] = 0  # reset counter, lockout window is now the deterrent

        db.execute(
            text("""
                UPDATE users SET failed_login_attempts = :attempts, locked_until = :locked_until
                WHERE id = :id
            """),
            {"attempts": lock_fields["attempts"], "locked_until": lock_fields["locked_until"], "id": user.id},
        )
        log_audit(db, user.id, "login_failed", "user", user.id)
        db.commit()
        raise invalid_creds

    if user.account_status != "active":
        raise HTTPException(status_code=403, detail="Account is not active")

    # Success: reset lockout counters, record the login, issue tokens.
    db.execute(
        text("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = :id"),
        {"id": user.id},
    )
    is_new_device = _record_login(db, user.id, request)
    if is_new_device:
        log_audit(db, user.id, "new_device_login", "user", user.id,
                   metadata={"ip": request.client.host if request.client else None})
        # Wire up a real provider in app/core/email.py, then uncomment:
        # send_email(user.email, "New sign-in to your MedNexus account",
        #            "We noticed a login from a new device or location. "
        #            "If this wasn't you, reset your password immediately.")

    access_token = create_access_token(user_id=user.id, role=user.role)
    refresh_token = _issue_refresh_token(db, user.id)
    log_audit(db, user.id, "login_success", "user", user.id)
    db.commit()

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
        new_device=is_new_device,
    )


# ---------------------------------------------------------------------------
# Refresh — rotates the refresh token on every use (old one is revoked and
# linked via replaced_by, so reuse of a stolen-but-already-used token is
# detectable if you later add alerting on that condition).
# ---------------------------------------------------------------------------
@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(data.refresh_token)

    row = db.execute(
        text("""
            SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
                   u.full_name, u.role, u.account_status
            FROM refresh_tokens rt
            JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = :hash
        """),
        {"hash": token_hash},
    ).fetchone()

    invalid = HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if not row or row.revoked or row.expires_at < datetime.now(timezone.utc):
        raise invalid
    if row.account_status != "active":
        raise HTTPException(status_code=403, detail="Account is not active")

    new_refresh_token = generate_opaque_token()
    new_expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    new_row = db.execute(
        text("""
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES (:user_id, :token_hash, :expires_at)
            RETURNING id
        """),
        {"user_id": row.user_id, "token_hash": hash_token(new_refresh_token), "expires_at": new_expires_at},
    ).fetchone()

    db.execute(
        text("UPDATE refresh_tokens SET revoked = TRUE, replaced_by = :new_id WHERE id = :old_id"),
        {"new_id": new_row.id, "old_id": row.id},
    )
    db.commit()

    return TokenPair(
        access_token=create_access_token(user_id=row.user_id, role=row.role),
        refresh_token=new_refresh_token,
        user_id=row.user_id,
        full_name=row.full_name,
        role=row.role,
    )


# ---------------------------------------------------------------------------
# Logout — revokes the specific refresh token. The access token stays
# technically valid until it naturally expires (max 15 minutes) — that's
# an accepted tradeoff of stateless JWTs; add a short-lived denylist
# keyed by token if you need harder guarantees.
# ---------------------------------------------------------------------------
@router.post("/logout", status_code=204)
def logout(data: LogoutRequest, db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = :hash"),
        {"hash": hash_token(data.refresh_token)},
    )
    db.commit()
    return None


@router.post("/logout-everywhere", status_code=204)
def logout_everywhere(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    db.execute(
        text("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = :uid AND revoked = FALSE"),
        {"uid": current_user.id},
    )
    log_audit(db, current_user.id, "logout_everywhere", "user", current_user.id)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Password reset (forgot password, not logged in)
# ---------------------------------------------------------------------------
@router.post("/password-reset/request", status_code=202)
@limiter.limit("3/minute")
def request_password_reset(request: Request, data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id, email FROM users WHERE email = :email"),
        {"email": data.email},
    ).fetchone()

    # Always return the same response whether or not the account exists —
    # otherwise this endpoint becomes a way to check who has an account.
    generic_response = {"message": "If that email is registered, a reset link has been sent."}

    if not user:
        return generic_response

    raw_token = generate_opaque_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)

    db.execute(
        text("""
            INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
            VALUES (:user_id, :token_hash, :expires_at)
        """),
        {"user_id": user.id, "token_hash": hash_token(raw_token), "expires_at": expires_at},
    )
    log_audit(db, user.id, "password_reset_requested", "user", user.id)
    db.commit()

    reset_link = f"{FRONTEND_URL}/reset-password?token={raw_token}"
    send_email(
        user.email,
        "Reset your MedNexus password",
        f"Click the link below to reset your password. This link expires in "
        f"{PASSWORD_RESET_EXPIRE_MINUTES} minutes.\n\n{reset_link}\n\n"
        f"If you didn't request this, you can safely ignore this email.",
    )

    return generic_response


@router.post("/password-reset/confirm", status_code=200)
def confirm_password_reset(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    validate_password_strength(data.new_password)

    token_hash = hash_token(data.token)
    row = db.execute(
        text("""
            SELECT id, user_id, expires_at, used FROM password_reset_tokens
            WHERE token_hash = :hash
        """),
        {"hash": token_hash},
    ).fetchone()

    invalid = HTTPException(status_code=400, detail="Invalid or expired reset link")

    if not row or row.used or row.expires_at < datetime.now(timezone.utc):
        raise invalid

    db.execute(
        text("UPDATE users SET password_hash = :hash WHERE id = :id"),
        {"hash": hash_password(data.new_password), "id": row.user_id},
    )
    db.execute(
        text("UPDATE password_reset_tokens SET used = TRUE WHERE id = :id"),
        {"id": row.id},
    )
    # A password reset means "assume the old password was compromised" —
    # kill every existing session, not just let the new password coexist
    # with old refresh tokens.
    db.execute(
        text("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = :uid AND revoked = FALSE"),
        {"uid": row.user_id},
    )
    log_audit(db, row.user_id, "password_reset_completed", "user", row.user_id)
    db.commit()

    return {"message": "Password has been reset. Please log in with your new password."}


# ---------------------------------------------------------------------------
# Password change (logged in, knows current password)
# ---------------------------------------------------------------------------
@router.post("/password-change", response_model=TokenPair)
def change_password(
    data: PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # BEFORE: this whole endpoint was broken — it read `current_user.email`
    # (CurrentUser only carries id/role/account_status, so this raised
    # AttributeError on every call), then referenced `user.id` on the line
    # that was supposed to *define* `user` (NameError), and never once
    # checked `data.current_password` against anything — so even a fixed
    # version of this code would have let anyone change their own password
    # without proving they knew the current one. Fixed below: look the user
    # up first, verify current_password, then update.
    user = db.execute(
        text("SELECT id, email, password_hash, full_name, role FROM users WHERE id = :id"),
        {"id": current_user.id},
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email == "demo@mednexus.com":
        raise HTTPException(
            status_code=403,
            detail="Demo account cannot change password"
        )

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    validate_password_strength(data.new_password)

    db.execute(
        text("UPDATE users SET password_hash = :hash WHERE id = :id"),
        {"hash": hash_password(data.new_password), "id": user.id},
    )
    # Revoke every other session but keep this one alive by issuing a
    # fresh token pair in the response — a password change shouldn't log
    # the user themselves out immediately, just everyone else.
    db.execute(
        text("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = :uid AND revoked = FALSE"),
        {"uid": user.id},
    )
    new_refresh_token = _issue_refresh_token(db, user.id)
    log_audit(db, user.id, "password_changed", "user", user.id)
    db.commit()

    return TokenPair(
        access_token=create_access_token(user_id=user.id, role=user.role),
        refresh_token=new_refresh_token,
        user_id=user.id,
        full_name=user.full_name,
        role=user.role,
    )
