from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import get_current_user, CurrentUser
from app.models.schemas import BookmarkRequest

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])


@router.post("", status_code=201)
def add_bookmark(
    data: BookmarkRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    existing = db.execute(
        text("SELECT id FROM bookmarks WHERE user_id = :uid AND mcq_id = :mid"),
        {"uid": current_user.id, "mid": data.mcq_id},
    ).fetchone()
    if existing:
        return {"id": existing.id, "already_bookmarked": True}

    row = db.execute(
        text("""
            INSERT INTO bookmarks (user_id, mcq_id)
            VALUES (:uid, :mid)
            RETURNING id, mcq_id, created_at
        """),
        {"uid": current_user.id, "mid": data.mcq_id},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


@router.get("")
def list_bookmarks(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    rows = db.execute(
        text("""
            SELECT b.id AS bookmark_id, b.created_at, m.id AS mcq_id, m.question,
                   m.option_a, m.option_b, m.option_c, m.option_d,
                   m.correct_answer, m.explanation
            FROM bookmarks b
            JOIN mcqs m ON m.id = b.mcq_id
            WHERE b.user_id = :uid
            ORDER BY b.created_at DESC
        """),
        {"uid": current_user.id},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.delete("/{mcq_id}", status_code=204)
def remove_bookmark(
    mcq_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    db.execute(
        text("DELETE FROM bookmarks WHERE user_id = :uid AND mcq_id = :mid"),
        {"uid": current_user.id, "mid": mcq_id},
    )
    db.commit()
    return None
