from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.audit import log_audit
from app.core.security import require_admin, CurrentUser
from app.models.schemas import CreateBookRequest

router = APIRouter(tags=["Books"])


@router.get("/books")
def get_books(db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT id, title, description, created_at FROM books ORDER BY id")
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/books", status_code=201)
def create_book(
    data: CreateBookRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    # THIS ENDPOINT DID NOT EXIST AT ALL BEFORE.
    # frontend_src/services/api.ts bookService.createBook has always POSTed
    # to /books; books.py only ever defined GET /books. Every "Create Book"
    # click was hitting FastAPI's default 405 Method Not Allowed.
    row = db.execute(
        text("""
            INSERT INTO books (title, description)
            VALUES (:title, :description)
            RETURNING id, title, description, created_at
        """),
        {"title": data.title, "description": data.description},
    ).fetchone()
    log_audit(db, _admin.id, "book_created", "book", row.id, metadata={"title": data.title})
    db.commit()
    return dict(row._mapping)


@router.delete("/books/{book_id}", status_code=204)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    db.execute(text("DELETE FROM books WHERE id = :id"), {"id": book_id})
    log_audit(db, _admin.id, "book_deleted", "book", book_id)
    db.commit()
    return None
