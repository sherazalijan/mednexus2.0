from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.security import require_admin, CurrentUser
from app.models.schemas import CreateMCQRequest

router = APIRouter(tags=["MCQs"])


@router.post("/mcqs", status_code=201)
def create_mcq(
    data: CreateMCQRequest,
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    row = db.execute(
        text("""
            INSERT INTO mcqs (
                chapter_id, question, option_a, option_b, option_c, option_d,
                correct_answer, explanation, page_number
            )
            VALUES (
                :chapter_id, :question, :option_a, :option_b, :option_c,
                :option_d, :correct_answer, :explanation, :page_number
            )
            RETURNING id, chapter_id, question, option_a, option_b, option_c,
                      option_d, correct_answer, explanation, page_number
        """),
        data.model_dump(),
    ).fetchone()
    db.commit()
    return dict(row._mapping)
