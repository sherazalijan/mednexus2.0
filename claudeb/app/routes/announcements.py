from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import get_current_user, require_admin, CurrentUser
from app.models.schemas import AnnouncementRequest

router = APIRouter(tags=["Announcements"])


@router.post("/admin/announcements", status_code=201)
def create_announcement(
    data: AnnouncementRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    row = db.execute(
        text("""
            INSERT INTO announcements (title, message, expires_at, is_active)
            VALUES (:title, :message, :expires_at, TRUE)
            RETURNING id, title, message, created_at, expires_at, is_active
        """),
        {"title": data.title, "message": data.message, "expires_at": data.expires_at},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


@router.get("/announcements")
def get_active_announcements(
    db: Session = Depends(get_db),
    _user: CurrentUser = Depends(get_current_user),
):
    rows = db.execute(
        text("""
            SELECT id, title, message, created_at, expires_at
            FROM announcements
            WHERE is_active = TRUE
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC
        """)
    ).fetchall()
    return [dict(r._mapping) for r in rows]
