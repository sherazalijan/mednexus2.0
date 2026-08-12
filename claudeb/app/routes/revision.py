import json
import random

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import get_current_user, CurrentUser

router = APIRouter(prefix="/revision", tags=["Full Book Revision"])


# ---------------------------------------------------------------------------
# Request/response shapes specific to this file
# ---------------------------------------------------------------------------
class StartRevisionRequest(BaseModel):
    restart: bool = False
    shuffle: bool = False


class SaveRevisionProgressRequest(BaseModel):
    current_index: int = Field(ge=0)
    answered: dict[str, str] = Field(default_factory=dict)
    status: str = Field(default="in_progress", pattern="^(in_progress|paused|completed)$")


# ---------------------------------------------------------------------------
# Internal helpers
#
# `mcq_ids` / `answered` are stored as JSONB. Depending on the DBAPI driver
# these can come back from the DB either already-parsed (list/dict) or as a
# raw JSON string — normalize defensively rather than assuming one or the
# other, so this keeps working regardless of driver/version.
# ---------------------------------------------------------------------------
def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, str):
        return json.loads(value)
    return list(value)


def _as_dict(value) -> dict:
    if value is None:
        return {}
    if isinstance(value, str):
        return json.loads(value)
    return dict(value)


def _load_book_mcq_ids(db: Session, book_id: int, shuffle: bool) -> list[int]:
    rows = db.execute(
        text("""
            SELECT m.id
            FROM mcqs m
            JOIN chapters c ON c.id = m.chapter_id
            WHERE c.book_id = :book_id
            ORDER BY c.id, m.id
        """),
        {"book_id": book_id},
    ).fetchall()
    ids = [r.id for r in rows]
    if shuffle:
        random.shuffle(ids)
    return ids


def _hydrate_questions(db: Session, mcq_ids: list[int]) -> list[dict]:
    """Fetch full MCQ rows for a session's id list, preserving session order.
    Silently drops any ids that no longer exist (e.g. an admin deleted a
    question after the session was created) instead of erroring."""
    if not mcq_ids:
        return []
    rows = db.execute(
        text("""
            SELECT id, chapter_id, question, option_a, option_b, option_c, option_d,
                   correct_answer, explanation
            FROM mcqs
            WHERE id = ANY(:ids)
        """),
        {"ids": mcq_ids},
    ).fetchall()
    by_id = {r.id: dict(r._mapping) for r in rows}
    return [by_id[i] for i in mcq_ids if i in by_id]


def _book_exists(db: Session, book_id: int) -> bool:
    return db.execute(text("SELECT 1 FROM books WHERE id = :id"), {"id": book_id}).fetchone() is not None


# ---------------------------------------------------------------------------
# Status check — used by the book/chapters page to decide whether to render
# "Start Full Book Revision" or "Continue Revision".
# ---------------------------------------------------------------------------
@router.get("/book/{book_id}")
def get_revision_status(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    row = db.execute(
        text("""
            SELECT current_index, mcq_ids, answered, status, started_at, updated_at
            FROM book_revision_sessions
            WHERE user_id = :uid AND book_id = :book_id
        """),
        {"uid": current_user.id, "book_id": book_id},
    ).fetchone()
    if not row:
        return {"has_session": False}

    total = len(_as_list(row.mcq_ids))
    answered_count = len(_as_dict(row.answered))
    return {
        "has_session": True,
        "status": row.status,
        "current_index": row.current_index,
        "total_questions": total,
        "answered_count": answered_count,
        "started_at": row.started_at,
        "updated_at": row.updated_at,
    }


# ---------------------------------------------------------------------------
# Feature 11 (Last Revision Resume) — the single most recently touched
# in-progress/paused session across every book, for a dashboard shortcut.
# ---------------------------------------------------------------------------
@router.get("/active")
def get_most_recent_active_session(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    row = db.execute(
        text("""
            SELECT s.book_id, b.title AS book_title, s.current_index, s.mcq_ids,
                   s.status, s.updated_at
            FROM book_revision_sessions s
            JOIN books b ON b.id = s.book_id
            WHERE s.user_id = :uid AND s.status IN ('in_progress', 'paused')
            ORDER BY s.updated_at DESC
            LIMIT 1
        """),
        {"uid": current_user.id},
    ).fetchone()
    if not row:
        return {"has_session": False}
    return {
        "has_session": True,
        "book_id": row.book_id,
        "book_title": row.book_title,
        "current_index": row.current_index,
        "total_questions": len(_as_list(row.mcq_ids)),
        "status": row.status,
        "updated_at": row.updated_at,
    }


# ---------------------------------------------------------------------------
# Start / resume / restart a full-book revision session.
#
# - No existing session, or restart=true  -> build a fresh ordered question
#   list from every chapter in the book and persist it.
# - Existing session and restart=false    -> return it as-is (this is what
#   "Continue Revision" calls) — the same fixed mcq_ids order as before, so
#   `current_index` still points at the right question.
# ---------------------------------------------------------------------------
@router.post("/book/{book_id}/start")
def start_or_resume_revision(
    book_id: int,
    data: StartRevisionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if not _book_exists(db, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

    existing = db.execute(
        text("""
            SELECT id, mcq_ids, current_index, answered, status
            FROM book_revision_sessions
            WHERE user_id = :uid AND book_id = :book_id
        """),
        {"uid": current_user.id, "book_id": book_id},
    ).fetchone()

    if existing and not data.restart:
        mcq_ids = _as_list(existing.mcq_ids)
        questions = _hydrate_questions(db, mcq_ids)
        safe_index = min(existing.current_index, max(len(questions) - 1, 0))
        return {
            "book_id": book_id,
            "status": existing.status,
            "current_index": safe_index,
            "answered": _as_dict(existing.answered),
            "total_questions": len(questions),
            "questions": questions,
        }

    mcq_ids = _load_book_mcq_ids(db, book_id, data.shuffle)
    if not mcq_ids:
        raise HTTPException(status_code=404, detail="This book has no published questions yet")

    if existing:
        db.execute(
            text("""
                UPDATE book_revision_sessions
                SET mcq_ids = :mcq_ids, current_index = 0, answered = '{}'::jsonb,
                    status = 'in_progress', started_at = NOW(), updated_at = NOW()
                WHERE id = :id
            """),
            {"mcq_ids": json.dumps(mcq_ids), "id": existing.id},
        )
    else:
        db.execute(
            text("""
                INSERT INTO book_revision_sessions
                    (user_id, book_id, mcq_ids, current_index, answered, status)
                VALUES (:uid, :book_id, :mcq_ids, 0, '{}'::jsonb, 'in_progress')
            """),
            {"uid": current_user.id, "book_id": book_id, "mcq_ids": json.dumps(mcq_ids)},
        )
    db.commit()

    questions = _hydrate_questions(db, mcq_ids)
    return {
        "book_id": book_id,
        "status": "in_progress",
        "current_index": 0,
        "answered": {},
        "total_questions": len(questions),
        "questions": questions,
    }


# ---------------------------------------------------------------------------
# Autosave — called after every answer, and by the explicit Pause button
# (status="paused"). Do NOT lose progress: this is a straight upsert-style
# update keyed on (user_id, book_id), so the latest call always wins.
# ---------------------------------------------------------------------------
@router.put("/book/{book_id}/progress")
def save_revision_progress(
    book_id: int,
    data: SaveRevisionProgressRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    result = db.execute(
        text("""
            UPDATE book_revision_sessions
            SET current_index = :idx, answered = :answered, status = :status, updated_at = NOW()
            WHERE user_id = :uid AND book_id = :book_id
            RETURNING id, current_index, status, updated_at
        """),
        {
            "idx": data.current_index,
            "answered": json.dumps(data.answered),
            "status": data.status,
            "uid": current_user.id,
            "book_id": book_id,
        },
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="No revision session in progress for this book")
    db.commit()
    return dict(result._mapping)


# ---------------------------------------------------------------------------
# Clear a session outright (used after a book revision is submitted via the
# existing /quiz/submit endpoint, and available as an explicit "abandon").
# ---------------------------------------------------------------------------
@router.delete("/book/{book_id}", status_code=204)
def clear_revision_session(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    db.execute(
        text("DELETE FROM book_revision_sessions WHERE user_id = :uid AND book_id = :book_id"),
        {"uid": current_user.id, "book_id": book_id},
    )
    db.commit()
    return None
