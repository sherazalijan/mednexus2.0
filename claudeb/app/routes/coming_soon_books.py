from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import require_admin, CurrentUser

router = APIRouter(tags=["Coming Soon Books"])


class ComingSoonBookRequest(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    category: str = Field(min_length=2, max_length=100)  # e.g. "MBBS 2nd Year", "FCPS Part 1", "BDS"
    target_audience: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=5, max_length=2000)
    release_tag: str = Field(default="Coming Soon Online", max_length=100)
    featured: bool = False


DEFAULT_COMING_SOON_BOOKS = [
    {
        "title": "TMM Super 6",
        "category": "MBBS 2nd Year",
        "target_audience": "2nd Year MBBS Students",
        "description": "High-yield chapter-wise MCQs and rapid revision notes for 2nd Year MBBS subjects.",
        "release_tag": "Coming Soon Online",
        "featured": True,
    },
    {
        "title": "SK24 (Super 24 FCPS Part 1)",
        "category": "FCPS Part 1",
        "target_audience": "FCPS Part 1 Aspirants & House Officers",
        "description": "Comprehensive 24-chapter past papers, explanations, and key concepts for FCPS Part 1.",
        "release_tag": "Coming Soon Online",
        "featured": True,
    },
    {
        "title": "SK23 (FCPS Part 1 Core)",
        "category": "FCPS Part 1",
        "target_audience": "FCPS Part 1 Aspirants",
        "description": "High-yield past paper questions with anatomical and physiological explanations.",
        "release_tag": "Coming Soon Online",
        "featured": True,
    },
    {
        "title": "Anatomy & Histology QBank",
        "category": "MBBS 1st Year",
        "target_audience": "1st Year MBBS Students",
        "description": "Gross Anatomy, Embryology, and Histology MCQs with high-resolution diagram explanations.",
        "release_tag": "In Preparation",
        "featured": False,
    },
    {
        "title": "Physiology & Biochemistry Master",
        "category": "MBBS 1st & 2nd Year",
        "target_audience": "1st & 2nd Year MBBS",
        "description": "Organ system physiological concepts, clinical biochemistry, and rapid revision MCQs.",
        "release_tag": "In Preparation",
        "featured": False,
    },
    {
        "title": "Clinical Medicine & Surgery Core",
        "category": "MBBS 4th & Final Year",
        "target_audience": "4th & Final Year MBBS",
        "description": "Internal Medicine, General Surgery, Gynae/Obs, and Pediatrics clinical scenario MCQs.",
        "release_tag": "Coming Soon",
        "featured": False,
    },
]


def _ensure_coming_soon_table(db: Session):
    db.execute(
        text("""
            CREATE TABLE IF NOT EXISTS coming_soon_books (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                target_audience VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                release_tag VARCHAR(100) NOT NULL DEFAULT 'Coming Soon Online',
                featured BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
    )
    db.commit()

    # Seed defaults if table is empty
    count = db.execute(text("SELECT COUNT(*) FROM coming_soon_books")).scalar()
    if count == 0:
        for b in DEFAULT_COMING_SOON_BOOKS:
            db.execute(
                text("""
                    INSERT INTO coming_soon_books (title, category, target_audience, description, release_tag, featured)
                    VALUES (:title, :category, :target_audience, :description, :release_tag, :featured)
                """),
                b,
            )
        db.commit()


@router.get("/coming-soon-books")
def list_coming_soon_books(db: Session = Depends(get_db)):
    _ensure_coming_soon_table(db)
    rows = db.execute(
        text("""
            SELECT id, title, category, target_audience, description, release_tag, featured, created_at
            FROM coming_soon_books
            ORDER BY featured DESC, id ASC
        """)
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/admin/coming-soon-books", status_code=201)
def create_coming_soon_book(
    data: ComingSoonBookRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_coming_soon_table(db)
    row = db.execute(
        text("""
            INSERT INTO coming_soon_books (title, category, target_audience, description, release_tag, featured)
            VALUES (:title, :category, :target_audience, :description, :release_tag, :featured)
            RETURNING id, title, category, target_audience, description, release_tag, featured, created_at
        """),
        data.model_dump(),
    ).fetchone()
    db.commit()
    return dict(row._mapping)


@router.put("/admin/coming-soon-books/{book_id}")
def update_coming_soon_book(
    book_id: int,
    data: ComingSoonBookRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_coming_soon_table(db)
    row = db.execute(
        text("""
            UPDATE coming_soon_books
            SET title = :title, category = :category, target_audience = :target_audience,
                description = :description, release_tag = :release_tag, featured = :featured
            WHERE id = :id
            RETURNING id, title, category, target_audience, description, release_tag, featured, created_at
        """),
        {**data.model_dump(), "id": book_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Coming Soon book not found")
    db.commit()
    return dict(row._mapping)


@router.delete("/admin/coming-soon-books/{book_id}", status_code=204)
def delete_coming_soon_book(
    book_id: int,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_coming_soon_table(db)
    db.execute(text("DELETE FROM coming_soon_books WHERE id = :id"), {"id": book_id})
    db.commit()
    return None
