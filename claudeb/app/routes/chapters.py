from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import require_admin, CurrentUser
from app.models.schemas import CreateChapterRequest

router = APIRouter(tags=["Chapters"])


@router.get("/books/{book_id}/chapters")
def get_chapters(book_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT id, book_id, chapter_name, created_at
            FROM chapters
            WHERE book_id = :book_id
            ORDER BY id
        """),
        {"book_id": book_id},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/books/{book_id}/chapters", status_code=201)
def create_chapter(
    book_id: int,
    data: CreateChapterRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    # Frontend has called this since day one (chapterService.createChapter);
    # it never existed on the backend.
    row = db.execute(
        text("""
            INSERT INTO chapters (book_id, chapter_name)
            VALUES (:book_id, :chapter_name)
            RETURNING id, book_id, chapter_name, created_at
        """),
        {"book_id": book_id, "chapter_name": data.chapter_name},
    ).fetchone()
    db.commit()
    return dict(row._mapping)


@router.get("/chapters/{chapter_id}/mcqs")
def get_chapter_mcqs(chapter_id: int, db: Session = Depends(get_db)):
    # Frontend calls this for "Study Full Chapter" mode (quizService.getMCQs);
    # it never existed. Without it, chapter-based practice is impossible —
    # only /quiz/random/{count} worked.
    rows = db.execute(
        text("""
            SELECT id, chapter_id, question, option_a, option_b, option_c,
                   option_d, correct_answer, explanation, page_number
            FROM mcqs
            WHERE chapter_id = :chapter_id
            ORDER BY id
        """),
        {"chapter_id": chapter_id},
    ).fetchall()
    return [dict(r._mapping) for r in rows]
