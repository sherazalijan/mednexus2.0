import random as random_module
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import get_current_user, CurrentUser
from app.models.schemas import QuizSubmission

router = APIRouter(prefix="/quiz", tags=["Quiz"])


@router.get("/random/{count}")
def random_quiz(count: int, db: Session = Depends(get_db)):
    # BEFORE: text(f"... LIMIT {count}") interpolated the value directly
    # into the SQL string. FastAPI's `count: int` type hint currently
    # saves this from being exploitable (non-numeric input 422s before
    # reaching the query), but it's a landmine: change that type hint,
    # add another f-string parameter, or reuse this pattern elsewhere with
    # a str field, and it becomes a real SQL injection. Always bind
    # params, never interpolate, even when a type hint "protects" you.
    count = max(1, min(count, 200))  # sane bounds regardless
    rows = db.execute(
        text("""
            SELECT id, question, option_a, option_b, option_c, option_d,
                   correct_answer, explanation
            FROM mcqs
            ORDER BY RANDOM()
            LIMIT :count
        """),
        {"count": count},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/chapter/{chapter_id}/{mode}")
def chapter_quiz(chapter_id: int, mode: str, db: Session = Depends(get_db)):
    """Feature: Full Chapter Mode. mode = 'sequential' | 'random'."""
    order_clause = "RANDOM()" if mode == "random" else "id"
    rows = db.execute(
        text(f"""
            SELECT id, question, option_a, option_b, option_c, option_d,
                   correct_answer, explanation
            FROM mcqs
            WHERE chapter_id = :chapter_id
            ORDER BY {order_clause}
        """),  # order_clause is a fixed internal literal, never user input
        {"chapter_id": chapter_id},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------------------------
# NEW — Practice Mode (mixed / multi-chapter) + Random Test Builder.
#
# Both features in the brief reduce to the same underlying query: "give me
# MCQs from this set of chapters, shuffled, optionally capped to N". One
# endpoint serves both call sites instead of two near-duplicate ones:
#   - Practice Mode (choose 1, several, or all chapters) ->
#         GET /quiz/mixed?chapter_ids=1,2,3            (no count = every MCQ)
#   - Random Test Builder, source = "Selected Chapters" ->
#         GET /quiz/mixed?chapter_ids=1,2,3&count=50
# "Entire Book" and "Entire Database" sources are served by
# /quiz/random/book/{book_id}/{count} and the existing /quiz/random/{count}
# respectively, so no new endpoint was needed for either of those.
# ---------------------------------------------------------------------------
def _parse_chapter_ids(chapter_ids: str) -> list[int]:
    try:
        ids = [int(c.strip()) for c in chapter_ids.split(",") if c.strip() != ""]
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="chapter_ids must be a comma-separated list of integers, e.g. '1,2,3'",
        )
    if not ids:
        raise HTTPException(status_code=422, detail="chapter_ids must contain at least one chapter id")
    return ids


@router.get("/mixed")
def mixed_quiz(
    chapter_ids: str = Query(..., description="Comma-separated chapter ids, e.g. '1,2,3'"),
    count: Optional[int] = Query(
        None, ge=1, le=200,
        description="Optional cap; omit to return every MCQ in the selected chapters",
    ),
    db: Session = Depends(get_db),
):
    ids = _parse_chapter_ids(chapter_ids)
    rows = db.execute(
        text("""
            SELECT id, chapter_id, question, option_a, option_b, option_c, option_d,
                   correct_answer, explanation
            FROM mcqs
            WHERE chapter_id = ANY(:ids)
        """),
        {"ids": ids},
    ).fetchall()
    questions = [dict(r._mapping) for r in rows]
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for the selected chapters")
    random_module.shuffle(questions)  # "MCQs should shuffle" — always shuffled
    if count is not None and count < len(questions):
        questions = questions[:count]
    return questions


@router.get("/random/book/{book_id}/{count}")
def random_book_quiz(book_id: int, count: int, db: Session = Depends(get_db)):
    """Random Test Builder — source = 'Entire Book'."""
    count = max(1, min(count, 200))
    rows = db.execute(
        text("""
            SELECT m.id, m.chapter_id, m.question, m.option_a, m.option_b, m.option_c,
                   m.option_d, m.correct_answer, m.explanation
            FROM mcqs m
            JOIN chapters c ON c.id = m.chapter_id
            WHERE c.book_id = :book_id
            ORDER BY RANDOM()
            LIMIT :count
        """),
        {"book_id": book_id, "count": count},
    ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="No questions found for this book")
    return [dict(r._mapping) for r in rows]


@router.post("/submit")
def submit_quiz(
    data: QuizSubmission,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    # BEFORE: user_id came from the request body, so any logged-in (or
    # not even logged-in, since there was no auth at all) client could
    # submit quiz attempts under ANY other user's id and pollute their
    # history/leaderboard/analytics. It's now taken from the verified JWT.
    correct = 0
    results = []
    for answer in data.answers:
        mcq = db.execute(
            text("""
                SELECT id, question, correct_answer, explanation
                FROM mcqs
                WHERE id = :id
            """),
            {"id": answer.mcq_id},
        ).fetchone()

        if not mcq:
            continue

        selected = answer.selected_answer

        # Determine status
        if not selected or str(selected).strip() == "":
            status = "unattempted"
            is_correct = False

        elif mcq.correct_answer.upper() == selected.upper():
            status = "correct"
            is_correct = True
            correct += 1

        else:
            status = "incorrect"
            is_correct = False

        results.append({
            "mcq_id": mcq.id,
            "question": mcq.question,
            "your_answer": selected,
            "correct_answer": mcq.correct_answer,
            "status": status,
            "is_correct": is_correct,
            "explanation": mcq.explanation,
        })

    total = len(results)
    unattempted = len([
        r for r in results
        if r["status"] == "unattempted"
    ])
    incorrect = len([
        r for r in results
        if r["status"] == "incorrect"
    ])
    score = round((correct / total) * 100, 2) if total > 0 else 0

    db.execute(
        text("""
            INSERT INTO quiz_attempts (
                user_id, chapter_id, quiz_type, total_questions,
                correct_answers, incorrect_answers, score_percentage,
                started_at, completed_at
            )
            VALUES (
                :user_id, :chapter_id, :quiz_type, :total, :correct,
                :incorrect, :score, NOW(), NOW()
            )
        """),
        {
            "user_id": current_user.id,
            "chapter_id": data.chapter_id,
            "quiz_type": data.quiz_type,
            "total": total,
            "correct": correct,
            "incorrect": incorrect + unattempted,
            "score": score,
        },
    )
    db.commit()

    return {
        "total_questions": total,
        "correct": correct,
        "incorrect": incorrect,
        "unattempted": unattempted,
        "score": score,
        "results": results,
    }
