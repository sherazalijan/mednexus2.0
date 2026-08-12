from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import get_current_user, CurrentUser

router = APIRouter(prefix="/users", tags=["Users"])


def _require_self_or_admin(user_id: int, current_user: CurrentUser):
    # BEFORE: none of these routes checked who was asking. Any client
    # could call /users/1/history, /users/2/history, /users/3/history...
    # and read every student's quiz history, stats, and subscription
    # status — a textbook IDOR (Insecure Direct Object Reference).
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")


@router.get("/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _require_self_or_admin(user_id, current_user)
    user = db.execute(
        text("""
            SELECT id, full_name, email, role, account_status
            FROM users WHERE id = :user_id
        """),
        {"user_id": user_id},
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user._mapping)


@router.get("/{user_id}/history")
def user_history(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _require_self_or_admin(user_id, current_user)
    attempts = db.execute(
        text("""
            SELECT id, quiz_type, chapter_id, total_questions, correct_answers,
                   score_percentage, completed_at
            FROM quiz_attempts
            WHERE user_id = :user_id
            ORDER BY completed_at DESC
        """),
        {"user_id": user_id},
    ).fetchall()
    return [dict(a._mapping) for a in attempts]


@router.get("/{user_id}/stats")
def user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _require_self_or_admin(user_id, current_user)
    stats = db.execute(
        text("""
            SELECT
                COUNT(*) as quizzes,
                COALESCE(SUM(correct_answers), 0) as correct,
                COALESCE(SUM(incorrect_answers), 0) as incorrect,
                COALESCE(AVG(score_percentage), 0) as average_score
            FROM quiz_attempts
            WHERE user_id = :user_id
        """),
        {"user_id": user_id},
    ).fetchone()
    return {
        "quizzes_taken": stats.quizzes,
        "correct_answers": stats.correct,
        "incorrect_answers": stats.incorrect,
        "average_score": round(float(stats.average_score), 2),
    }


@router.get("/{user_id}/subscription")
def get_subscription(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _require_self_or_admin(user_id, current_user)
    sub = db.execute(
        text("""
            SELECT plan_name, start_date, end_date, active
            FROM subscriptions
            WHERE user_id = :user_id
            ORDER BY id DESC LIMIT 1
        """),
        {"user_id": user_id},
    ).fetchone()
    if not sub:
        return {"active": False}
    return dict(sub._mapping)
