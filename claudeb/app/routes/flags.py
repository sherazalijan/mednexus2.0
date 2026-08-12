from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.rate_limit import limiter
from app.core.security import get_current_user, require_admin, CurrentUser
from app.models.schemas import FlagMCQRequest

router = APIRouter(tags=["MCQ Flags"])


@router.post("/mcqs/{mcq_id}/flag", status_code=201)
@limiter.limit("10/minute")
def flag_mcq(
    request: Request,
    mcq_id: int,
    data: FlagMCQRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    row = db.execute(
        text("""
            INSERT INTO mcq_flags (user_id, mcq_id, reason, details, status)
            VALUES (:uid, :mid, :reason, :details, 'pending')
            RETURNING id, mcq_id, reason, status, created_at
        """),
        {"uid": current_user.id, "mid": mcq_id, "reason": data.reason, "details": data.details},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


@router.get("/admin/flags")
def list_flags(
    status_filter: str = "pending",
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    rows = db.execute(
        text("""
            SELECT f.id, f.mcq_id, f.reason, f.details, f.status, f.created_at,
                   m.question, u.full_name AS reported_by
            FROM mcq_flags f
            JOIN mcqs m ON m.id = f.mcq_id
            JOIN users u ON u.id = f.user_id
            WHERE f.status = :status
            ORDER BY f.created_at DESC
        """),
        {"status": status_filter},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.patch("/admin/flags/{flag_id}")
def resolve_flag(
    flag_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    if new_status not in {"pending", "resolved", "dismissed"}:
        raise HTTPException(status_code=422, detail="Invalid status")
    result = db.execute(
        text("UPDATE mcq_flags SET status = :s WHERE id = :id RETURNING id, status"),
        {"s": new_status, "id": flag_id},
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Flag not found")
    db.commit()
    return dict(result._mapping)
