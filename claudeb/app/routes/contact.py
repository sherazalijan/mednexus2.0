from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import require_admin, CurrentUser

router = APIRouter(tags=["Contact & Complaints"])


class ContactSubmissionRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    category: str = Field(default="complaint", pattern="^(complaint|inquiry|ai_software|book_request)$")
    message: str = Field(min_length=5, max_length=3000)


def _ensure_contact_table(db: Session):
    db.execute(
        text("""
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL DEFAULT 'complaint',
                message TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'unread',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
    )
    db.commit()


@router.post("/contact/submit", status_code=201)
def submit_contact_form(data: ContactSubmissionRequest, db: Session = Depends(get_db)):
    _ensure_contact_table(db)
    row = db.execute(
        text("""
            INSERT INTO contact_submissions (full_name, email, category, message, status)
            VALUES (:full_name, :email, :category, :message, 'unread')
            RETURNING id, full_name, email, category, message, status, created_at
        """),
        {
            "full_name": data.full_name,
            "email": data.email,
            "category": data.category,
            "message": data.message,
        },
    ).fetchone()
    db.commit()
    return {"success": True, "message": "Your message/complaint has been submitted successfully.", "data": dict(row._mapping)}


@router.get("/admin/complaints")
def list_contact_complaints(
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_contact_table(db)
    rows = db.execute(
        text("""
            SELECT id, full_name, email, category, message, status, created_at
            FROM contact_submissions
            ORDER BY created_at DESC
        """)
    ).fetchall()
    return [dict(r._mapping) for r in rows]


class UpdateComplaintStatusRequest(BaseModel):
    status: str = Field(pattern="^(unread|read|in_progress|resolved)$")


@router.patch("/admin/complaints/{complaint_id}")
def update_complaint_status(
    complaint_id: int,
    data: UpdateComplaintStatusRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_contact_table(db)
    result = db.execute(
        text("""
            UPDATE contact_submissions
            SET status = :status
            WHERE id = :id
            RETURNING id, status
        """),
        {"status": data.status, "id": complaint_id},
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Complaint submission not found")
    db.commit()
    return dict(result._mapping)
