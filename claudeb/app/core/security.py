import hashlib
import os
import re
import secrets
import string
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except Exception:
        # Handles rows that still hold a legacy plaintext value from before
        # this fix. Verifying will simply fail closed (return False) rather
        # than raising, so login degrades safely instead of 500ing.
        return False


def generate_temp_password(length: int = 12) -> str:
    """Cryptographically secure temp password for admin-created accounts."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


PASSWORD_MIN_LENGTH = 8


def validate_password_strength(password: str) -> None:
    """
    Raises HTTPException(422) if the password is too weak. Used anywhere a
    USER chooses their own password (reset, change) — not for admin-
    generated temp passwords, which are already random and long enough.
    Deliberately not overly strict (no forced special-character rules,
    which push people toward predictable substitutions like 'Passw0rd!')
    — length + a mix of character classes is what actually resists
    cracking, per current NIST guidance.
    """
    problems = []
    if len(password) < PASSWORD_MIN_LENGTH:
        problems.append(f"at least {PASSWORD_MIN_LENGTH} characters")
    if not re.search(r"[A-Za-z]", password):
        problems.append("at least one letter")
    if not re.search(r"[0-9]", password):
        problems.append("at least one number")

    common_weak = {"password", "password1", "12345678", "qwertyui", "letmein1"}
    if password.lower() in common_weak:
        problems.append("not a commonly used password")

    if problems:
        raise HTTPException(
            status_code=422,
            detail=f"Password must have: {', '.join(problems)}",
        )


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
# CHANGE (MVP reliability — requested): the frontend now does a silent
# refresh on 401 (see src/services/api.ts), so a 15-minute token no longer
# strictly requires the user to notice anything. But 15 minutes still means
# every single active user re-hits /auth/refresh roughly 4x/hour, and any
# hiccup in that round trip (a slow request, a dropped connection, a
# request that lands exactly as the token expires) was presenting as a
# random mid-session logout — the "stay logged in" complaint. 60 minutes
# cuts that refresh frequency 4x while keeping a real upper bound on a
# leaked token's lifetime; the 30-day refresh token (and its rotation /
# revocation-on-password-change logic below) is still the real session
# boundary either way.
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 30

if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Generate one with "
        "`python -c \"import secrets; print(secrets.token_hex(32))\"` "
        "and add it to your backend's environment variables."
    )

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ---------------------------------------------------------------------------
# Refresh tokens / password-reset tokens
#
# Both are opaque random strings handed to the client; only their SHA-256
# hash is ever stored in the DB. This means a leaked database backup or a
# read-only SQL injection somewhere else in the app can't be used to
# forge a working refresh or reset token — the hash alone isn't reversible
# or directly usable.
# ---------------------------------------------------------------------------
def generate_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Auth dependencies — every protected route should depend on one of these
# instead of trusting a user_id passed in the URL or JSON body.
# ---------------------------------------------------------------------------
class CurrentUser:
    def __init__(self, id: int, role: str, account_status: str):
        self.id = id
        self.role = role
        self.account_status = account_status


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(credentials.credentials)
    user_id = int(payload["sub"])

    row = db.execute(
        text("SELECT id, role, account_status FROM users WHERE id = :id"),
        {"id": user_id},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="User no longer exists")
    if row.account_status != "active":
        raise HTTPException(status_code=403, detail="Account is disabled")

    return CurrentUser(id=row.id, role=row.role, account_status=row.account_status)


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_active_subscription(
    user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """
    Problem: Subscription System — 'Disabled users can still access
    features' because nothing ever checked the subscriptions table.
    Add this as a dependency on any premium route (e.g. full chapter
    mode, bulk practice, analytics) to enforce it server-side. Admins
    always pass.
    """
    if user.role == "admin":
        return user

    sub = db.execute(
        text("""
            SELECT active, end_date FROM subscriptions
            WHERE user_id = :user_id
            ORDER BY id DESC LIMIT 1
        """),
        {"user_id": user.id},
    ).fetchone()

    if not sub or not sub.active or sub.end_date < datetime.now(timezone.utc):
        raise HTTPException(status_code=402, detail="An active subscription is required")

    return user
