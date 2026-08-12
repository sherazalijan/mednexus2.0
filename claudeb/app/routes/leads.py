import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import require_admin, CurrentUser
from app.core.email import send_email

router = APIRouter(tags=["Visitor Leads & Demo Timer"])


class LeadSubmitRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    college: str = Field(min_length=2, max_length=200)
    whatsapp: Optional[str] = None
    year: str = Field(default="1st Year MBBS")


class DemoTimerConfig(BaseModel):
    active: bool = True
    title: str = "Limited Time Free Demo Mode"
    ends_at: str  # ISO string or relative days e.g. "2026-08-19T23:59:59Z"


class PromoEmailRequest(BaseModel):
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=5000)
    target_lead_ids: Optional[list[int]] = None  # None = send to all leads


def _ensure_lead_tables(db: Session):
    db.execute(
        text("""
            CREATE TABLE IF NOT EXISTS visitor_leads (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                college VARCHAR(255) NOT NULL,
                whatsapp VARCHAR(100),
                year VARCHAR(100) NOT NULL DEFAULT '1st Year MBBS',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
    )
    db.execute(
        text("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key VARCHAR(100) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
    )
    db.commit()


@router.post("/leads/submit", status_code=201)
def submit_visitor_lead(data: LeadSubmitRequest, db: Session = Depends(get_db)):
    _ensure_lead_tables(db)
    row = db.execute(
        text("""
            INSERT INTO visitor_leads (full_name, email, college, whatsapp, year)
            VALUES (:full_name, :email, :college, :whatsapp, :year)
            RETURNING id, full_name, email, college, whatsapp, year, created_at
        """),
        {
            "full_name": data.full_name,
            "email": data.email,
            "college": data.college,
            "whatsapp": data.whatsapp or "",
            "year": data.year,
        },
    ).fetchone()
    db.commit()
    return {"success": True, "message": "Lead saved successfully.", "data": dict(row._mapping)}


@router.get("/admin/leads")
def get_visitor_leads(
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_lead_tables(db)
    rows = db.execute(
        text("SELECT id, full_name, email, college, whatsapp, year, created_at FROM visitor_leads ORDER BY created_at DESC")
    ).fetchall()
    leads = [dict(r._mapping) for r in rows]
    total_count = len(leads)
    return {
        "total_leads": total_count,
        "leads": leads,
    }


@router.post("/admin/leads/send-promo", status_code=200)
def send_promo_email_to_leads(
    data: PromoEmailRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_lead_tables(db)
    if data.target_lead_ids:
        rows = db.execute(
            text("SELECT email, full_name FROM visitor_leads WHERE id = ANY(:ids)"),
            {"ids": data.target_lead_ids},
        ).fetchall()
    else:
        rows = db.execute(text("SELECT email, full_name FROM visitor_leads")).fetchall()

    recipients = [dict(r._mapping) for r in rows]
    sent_count = 0
    for r in recipients:
        send_email(
            to_email=r["email"],
            subject=data.subject,
            body=f"Hello Dr. {r['full_name']},\n\n{data.message}\n\nBest regards,\nMedNexus Team\nhttps://mednexus.app",
        )
        sent_count += 1

    return {"success": True, "sent_count": sent_count, "message": f"Promotional email sent to {sent_count} leads."}


# ---------------------------------------------------------------------------
# Demo Mode Timer Admin & Public Routes
# ---------------------------------------------------------------------------
@router.get("/demo-timer")
def get_demo_timer_config(db: Session = Depends(get_db)):
    _ensure_lead_tables(db)
    row = db.execute(text("SELECT value FROM app_settings WHERE key = 'demo_timer'")).fetchone()
    if not row:
        # Default: timer ends 7 days from now
        default_ends = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        default_config = {
            "active": True,
            "title": "⚡ Free Demo Mode access ending soon! Lock in your 500 PKR subscription price today.",
            "ends_at": default_ends,
        }
        return default_config
    val = row.value
    if isinstance(val, str):
        return json.loads(val)
    return val


@router.post("/admin/demo-timer")
def update_demo_timer_config(
    data: DemoTimerConfig,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    _ensure_lead_tables(db)
    val_json = json.dumps(data.model_dump())
    db.execute(
        text("""
            INSERT INTO app_settings (key, value, updated_at)
            VALUES ('demo_timer', :val::jsonb, NOW())
            ON CONFLICT (key) DO UPDATE SET value = :val::jsonb, updated_at = NOW()
        """),
        {"val": val_json},
    )
    db.commit()
    return {"success": True, "config": data.model_dump()}
