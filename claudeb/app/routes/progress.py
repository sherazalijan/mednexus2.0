from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import get_current_user, CurrentUser
from app.models.schemas import SaveProgressRequest

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.put("/{chapter_id}")
def save_progress(
    chapter_id: int,
    data: SaveProgressRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Upsert: one row per (user, chapter). Requires a UNIQUE constraint on
    # (user_id, chapter_id) — see migrations.sql.
    row = db.execute(
        text("""
            INSERT INTO user_chapter_progress
                (user_id, chapter_id, last_question_index, questions_completed, score, updated_at)
            VALUES (:user_id, :chapter_id, :last_question_index, :questions_completed, :score, NOW())
            ON CONFLICT (user_id, chapter_id) DO UPDATE SET
                last_question_index = EXCLUDED.last_question_index,
                questions_completed = EXCLUDED.questions_completed,
                score = EXCLUDED.score,
                updated_at = NOW()
            RETURNING id, chapter_id, last_question_index, questions_completed, score, updated_at
        """),
        {
            "user_id": current_user.id,
            "chapter_id": chapter_id,
            "last_question_index": data.last_question_index,
            "questions_completed": data.questions_completed,
            "score": data.score,
        },
    ).fetchone()
    db.commit()
    return dict(row._mapping)


@router.get("/{chapter_id}")
def get_progress(
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    row = db.execute(
        text("""
            SELECT last_question_index, questions_completed, score, updated_at
            FROM user_chapter_progress
            WHERE user_id = :user_id AND chapter_id = :chapter_id
        """),
        {"user_id": current_user.id, "chapter_id": chapter_id},
    ).fetchone()
    if not row:
        return {"last_question_index": 0, "questions_completed": 0, "score": None}
    return dict(row._mapping)
