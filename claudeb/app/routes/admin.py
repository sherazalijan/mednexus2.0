from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.audit import log_audit
from app.core.rate_limit import limiter
from app.core.security import require_admin, CurrentUser, hash_password, generate_temp_password
from app.models.schemas import CreateUserRequest, CreateUserResponse, UpdateUserStatusRequest

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
@router.get("/users")
def get_users(db: Session = Depends(get_db), _admin: CurrentUser = Depends(require_admin)):
    users = db.execute(
        text("""
            SELECT id, full_name, email, role, account_status
            FROM users ORDER BY id
        """)
    ).fetchall()
    return [dict(u._mapping) for u in users]


@router.post("/create-user", response_model=CreateUserResponse, status_code=201)
@limiter.limit("10/minute")
def create_user(
    request: Request,
    data: CreateUserRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    """
    Problem 1 fix: the frontend's "Create User" form was only ever built to
    collect full_name/email/role (see AdminUsers.tsx — there is no password
    field in the UI at all) while the backend's Pydantic model required
    `password`, guaranteeing a 422 on every submission.

    Fix (matches the preferred solution in the project brief): generate a
    secure temporary password server-side, hash it before storing, and
    return it once so the admin can share it with the student (or wire up
    an email-based setup flow later — see the audit report for that path).
    """
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": data.email},
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    temp_password = generate_temp_password()
    password_hash = hash_password(temp_password)

    row = db.execute(
        text("""
            INSERT INTO users (full_name, email, password_hash, role, account_status)
            VALUES (:full_name, :email, :password_hash, :role, 'active')
            RETURNING id, full_name, email, role, account_status
        """),
        {
            "full_name": data.full_name,
            "email": data.email,
            "password_hash": password_hash,
            "role": data.role,
        },
    ).fetchone()
    log_audit(db, _admin.id, "user_created", "user", row.id, metadata={"role": data.role})
    db.commit()

    return CreateUserResponse(**dict(row._mapping), temporary_password=temp_password)


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    data: UpdateUserStatusRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    # Frontend (adminService.updateUserStatus) has always called
    # PATCH /admin/users/{id}/status. The backend only ever had
    # POST /admin/disable-user/{id}, a different path AND method — so every
    # status toggle in the Admin Users UI silently 404'd.
    result = db.execute(
        text("""
            UPDATE users SET account_status = :status
            WHERE id = :user_id
            RETURNING id, full_name, email, role, account_status
        """),
        {"status": data.account_status, "user_id": user_id},
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    log_audit(db, _admin.id, "user_status_changed", "user", user_id,
              metadata={"new_status": data.account_status})
    db.commit()
    return dict(result._mapping)


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str = Query(..., pattern="^(student|admin)$"),
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    result = db.execute(
        text("""
            UPDATE users SET role = :role
            WHERE id = :user_id
            RETURNING id, full_name, email, role, account_status
        """),
        {"role": role, "user_id": user_id},
    ).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    log_audit(db, _admin.id, "user_role_changed", "user", user_id, metadata={"new_role": role})
    db.commit()
    return dict(result._mapping)


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------
@router.post("/create-subscription")
def create_subscription(
    data: dict,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    required = {"user_id", "plan_name", "end_date"}
    if not required.issubset(data.keys()):
        raise HTTPException(status_code=422, detail=f"Missing fields: {required - data.keys()}")

    db.execute(
        text("""
            INSERT INTO subscriptions (user_id, plan_name, start_date, end_date, active)
            VALUES (:user_id, :plan_name, NOW(), :end_date, TRUE)
        """),
        {"user_id": data["user_id"], "plan_name": data["plan_name"], "end_date": data["end_date"]},
    )
    db.commit()
    return {"success": True, "message": "Subscription created"}


# ---------------------------------------------------------------------------
# Leaderboards (global / weekly / per-book / per-chapter)
# ---------------------------------------------------------------------------
@router.get("/leaderboard")
def leaderboard(
    scope: str = Query("global", pattern="^(global|weekly|monthly|book|chapter)$"),
    book_id: Optional[int] = None,
    chapter_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    where = []
    params = {}

    if scope == "weekly":
        where.append("q.completed_at >= NOW() - INTERVAL '7 days'")
    elif scope == "monthly":
        where.append("q.completed_at >= NOW() - INTERVAL '30 days'")
    elif scope == "book":
        if not book_id:
            raise HTTPException(status_code=422, detail="book_id is required for scope=book")
        where.append("c.book_id = :book_id")
        params["book_id"] = book_id
    elif scope == "chapter":
        if not chapter_id:
            raise HTTPException(status_code=422, detail="chapter_id is required for scope=chapter")
        where.append("q.chapter_id = :chapter_id")
        params["chapter_id"] = chapter_id

    join_chapters = "JOIN chapters c ON c.id = q.chapter_id" if scope == "book" else ""
    where_clause = f"WHERE {' AND '.join(where)}" if where else ""

    rows = db.execute(
        text(f"""
            SELECT u.id AS user_id, u.full_name,
                   COUNT(q.id) AS quizzes,
                   AVG(q.score_percentage) AS avg_score
            FROM users u
            JOIN quiz_attempts q ON u.id = q.user_id
            {join_chapters}
            {where_clause}
            GROUP BY u.id, u.full_name
            ORDER BY avg_score DESC, quizzes DESC
            LIMIT 100
        """),
        params,
    ).fetchall()

    return [
        {
            "rank": i + 1,
            "user_id": row.user_id,
            "full_name": row.full_name,
            "total_attempts": row.quizzes,
            "score_percentage": round(float(row.avg_score), 2),
        }
        for i, row in enumerate(rows)
    ]


# ---------------------------------------------------------------------------
# Dashboard / Analytics
# ---------------------------------------------------------------------------
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _admin: CurrentUser = Depends(require_admin)):
    # Problem 3 fix: the frontend (adminService.getAnalytics) expects
    # {total_users, total_books, total_chapters, total_mcqs, total_attempts,
    # average_score}. The old handler returned {total_users, active_users,
    # disabled_users, total_mcqs, total_books, total_quiz_attempts} — none
    # of the frontend's expected keys except total_users/total_mcqs/
    # total_books actually matched, so the UI had undefined values and
    # (combined with the leaked-connections issue in base.py) surfaced as
    # "Database Analytics Offline". This returns every field either
    # consumer needs.
    counts = db.execute(
        text("""
            SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM users WHERE account_status = 'active') AS active_users,
                (SELECT COUNT(*) FROM users WHERE account_status = 'disabled') AS disabled_users,
                (SELECT COUNT(*) FROM books) AS total_books,
                (SELECT COUNT(*) FROM chapters) AS total_chapters,
                (SELECT COUNT(*) FROM mcqs) AS total_mcqs,
                (SELECT COUNT(*) FROM quiz_attempts) AS total_attempts,
                (SELECT COALESCE(AVG(score_percentage), 0) FROM quiz_attempts) AS average_score
        """)
    ).fetchone()
    result = dict(counts._mapping)
    result["average_score"] = round(float(result["average_score"]), 2)
    return result


@router.get("/extraction-status")
def extraction_status(db: Session = Depends(get_db), _admin: CurrentUser = Depends(require_admin)):
    # Frontend calls this (adminService.getMCQExtractionStatus) to show
    # per-chapter MCQ counts / import progress; it never existed.
    rows = db.execute(
        text("""
            SELECT c.id AS chapter_id, c.chapter_name,
                   COUNT(m.id) AS total_mcqs,
                   MAX(m.created_at) AS last_updated
            FROM chapters c
            LEFT JOIN mcqs m ON m.chapter_id = c.id
            GROUP BY c.id, c.chapter_name
            ORDER BY c.id
        """)
    ).fetchall()
    return [
        {
            "chapter_id": r.chapter_id,
            "chapter_name": r.chapter_name,
            "status": "completed" if r.total_mcqs > 0 else "idle",
            "total_mcqs": r.total_mcqs,
            "last_updated": r.last_updated,
        }
        for r in rows
    ]
