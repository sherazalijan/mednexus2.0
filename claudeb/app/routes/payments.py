import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.audit import log_audit
from app.core.security import get_current_user, require_admin, CurrentUser

router = APIRouter(tags=["Payments"])

# Relative to the process's working directory, which is `claudeb/` when run
# the normal way (`uvicorn app.main:app` from inside claudeb/) — same place
# the existing uploads/ folder already lives. Override with an absolute path
# via PAYMENT_PROOF_UPLOAD_DIR in production.
#
# NOTE (serverless deployment, e.g. Vercel): the filesystem is read-only
# except /tmp, and /tmp is wiped between invocations/cold starts. If you
# deploy this backend to Vercel (see the NullPool comment in
# app/database/base.py — this project already targets that), set
# PAYMENT_PROOF_UPLOAD_DIR to a real object store path instead (S3/R2/
# Supabase Storage) or point it at /tmp only as a short-term stopgap, since
# files written there will NOT persist.
UPLOAD_DIR = os.getenv("PAYMENT_PROOF_UPLOAD_DIR", "uploads/payment_proofs")

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB


class ReviewPaymentProofRequest(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
    admin_note: Optional[str] = None
    # Optional convenience: grant a subscription in the same action as
    # approving, using the same fields the existing
    # POST /admin/create-subscription endpoint accepts. Left blank, approving
    # a proof does NOT touch subscriptions — the admin can still grant one
    # separately at any time.
    plan_name: Optional[str] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=3650)


# ---------------------------------------------------------------------------
# Student: submit a payment screenshot for review
# ---------------------------------------------------------------------------
@router.post("/payments/proof", status_code=201)
async def submit_payment_proof(
    plan_name: str = Form(...),
    note: str = Form(default=""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail="File must be a PNG, JPG or WEBP image")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=422, detail="File must be smaller than 5MB")
    if not raw:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")

    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1][:10] or ".jpg"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(user_dir, stored_name), "wb") as f:
        f.write(raw)

    relative_path = os.path.join(str(current_user.id), stored_name)

    row = db.execute(
        text("""
            INSERT INTO payment_proofs
                (user_id, file_path, original_filename, plan_name, note, status)
            VALUES (:uid, :file_path, :original_filename, :plan_name, :note, 'pending')
            RETURNING id, plan_name, note, status, created_at
        """),
        {
            "uid": current_user.id,
            "file_path": relative_path,
            "original_filename": file.filename,
            "plan_name": plan_name,
            "note": note,
        },
    ).fetchone()
    log_audit(db, current_user.id, "payment_proof_submitted", "payment_proof", row.id,
              metadata={"plan_name": plan_name})
    db.commit()
    return dict(row._mapping)


@router.get("/payments/proof/mine")
def list_my_payment_proofs(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows = db.execute(
        text("""
            SELECT id, plan_name, note, status, admin_note, created_at, reviewed_at
            FROM payment_proofs
            WHERE user_id = :uid
            ORDER BY created_at DESC
        """),
        {"uid": current_user.id},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------------------------
# Admin: view / approve / reject
# ---------------------------------------------------------------------------
@router.get("/admin/payment-proofs")
def list_payment_proofs(
    status_filter: str = "pending",
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    if status_filter not in {"pending", "approved", "rejected", "all"}:
        raise HTTPException(status_code=422, detail="Invalid status filter")
    where = "" if status_filter == "all" else "WHERE p.status = :status"
    params = {} if status_filter == "all" else {"status": status_filter}
    rows = db.execute(
        text(f"""
            SELECT p.id, p.user_id, u.full_name, u.email, p.plan_name, p.note,
                   p.status, p.admin_note, p.created_at, p.reviewed_at
            FROM payment_proofs p
            JOIN users u ON u.id = p.user_id
            {where}
            ORDER BY p.created_at DESC
        """),
        params,
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/admin/payment-proofs/{proof_id}/file")
def get_payment_proof_file(
    proof_id: int,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    # Deliberately NOT a static file mount: this is the only way to view an
    # uploaded screenshot, and it's admin-gated like every other admin route.
    row = db.execute(
        text("SELECT file_path FROM payment_proofs WHERE id = :id"),
        {"id": proof_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    full_path = os.path.join(UPLOAD_DIR, row.file_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(full_path)


@router.patch("/admin/payment-proofs/{proof_id}")
def review_payment_proof(
    proof_id: int,
    data: ReviewPaymentProofRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    proof = db.execute(
        text("SELECT id, user_id, status FROM payment_proofs WHERE id = :id"),
        {"id": proof_id},
    ).fetchone()
    if not proof:
        raise HTTPException(status_code=404, detail="Payment proof not found")

    result = db.execute(
        text("""
            UPDATE payment_proofs
            SET status = :status, admin_note = :admin_note,
                reviewed_by = :admin_id, reviewed_at = NOW()
            WHERE id = :id
            RETURNING id, status, admin_note, reviewed_at
        """),
        {
            "status": data.status,
            "admin_note": data.admin_note,
            "admin_id": _admin.id,
            "id": proof_id,
        },
    ).fetchone()

    subscription_granted = False
    if data.status == "approved" and data.plan_name and data.duration_days:
        db.execute(
            text("""
                INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, active)
                VALUES (:user_id, :plan_name, NOW(), NOW() + make_interval(days => :days), TRUE)
            """),
            {"user_id": proof.user_id, "plan_name": data.plan_name, "days": data.duration_days},
        )
        subscription_granted = True

    log_audit(db, _admin.id, f"payment_proof_{data.status}", "payment_proof", proof_id,
              metadata={"subscription_granted": subscription_granted})
    db.commit()
    return {**dict(result._mapping), "subscription_granted": subscription_granted}
