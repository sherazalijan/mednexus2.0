from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ---- Auth ----
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    full_name: str
    role: str


# ---- Users / Admin ----
class CreateUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: str = Field(default="student", pattern="^(student|admin)$")
    # No `password` field: the backend generates a secure temporary
    # password itself (see Problem 1 in the audit). Admins never type or
    # see a password unless they explicitly request the temp password back.


class CreateUserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    account_status: str
    temporary_password: str  # shown once; also emailed if SMTP is configured


class UpdateUserStatusRequest(BaseModel):
    account_status: str = Field(pattern="^(active|pending|suspended|disabled)$")


# ---- Books / Chapters / MCQs ----
class CreateBookRequest(BaseModel):
    title: str
    description: Optional[str] = None


class CreateChapterRequest(BaseModel):
    chapter_name: str


class CreateMCQRequest(BaseModel):
    chapter_id: int
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str = Field(pattern="^[A-Da-d]$")
    explanation: Optional[str] = None
    page_number: Optional[int] = None


# ---- Quiz ----
class QuizAnswer(BaseModel):
    mcq_id: int
    selected_answer: Optional[str] = None


class QuizSubmission(BaseModel):
    answers: list[QuizAnswer]
    chapter_id: Optional[int] = None
    quiz_type: str = "random"
    # user_id intentionally removed: it's taken from the authenticated
    # JWT (see Problem: IDOR in security audit), never from the client.


# ---- Progress / Bookmarks / Flags / Announcements ----
class SaveProgressRequest(BaseModel):
    chapter_id: int
    last_question_index: int
    questions_completed: int
    score: Optional[float] = None


class BookmarkRequest(BaseModel):
    mcq_id: int


class FlagMCQRequest(BaseModel):
    mcq_id: int
    reason: str = Field(pattern="^(wrong_answer|typo|duplicate|outdated)$")
    details: Optional[str] = None


class AnnouncementRequest(BaseModel):
    title: str
    message: str
    expires_at: Optional[datetime] = None
