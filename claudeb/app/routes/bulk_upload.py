import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.base import get_db
from app.core.audit import log_audit
from app.core.security import require_admin, CurrentUser

router = APIRouter(prefix="/admin", tags=["Bulk Upload"])

REQUIRED_CSV_COLUMNS = {
    "question", "option_a", "option_b", "option_c", "option_d", "correct_answer"
}


def _validate_row(row: dict, line_no: int) -> dict:
    missing = REQUIRED_CSV_COLUMNS - row.keys()
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Row {line_no}: missing column(s) {sorted(missing)}",
        )
    if not row["question"].strip():
        raise HTTPException(status_code=422, detail=f"Row {line_no}: empty question")
    ans = row["correct_answer"].strip().upper()
    if ans not in {"A", "B", "C", "D"}:
        raise HTTPException(
            status_code=422,
            detail=f"Row {line_no}: correct_answer must be A/B/C/D, got '{ans}'",
        )
    return row


@router.post("/bulk-upload-mcqs")
async def bulk_upload_mcqs(
    chapter_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: CurrentUser = Depends(require_admin),
):
    """
    Accepts a .csv or .json file of MCQs for a given chapter and inserts
    them in a single transaction. Validates every row BEFORE inserting
    anything, so a bad row fails the whole batch instead of leaving the
    table half-populated.

    CSV columns required: question, option_a, option_b, option_c,
    option_d, correct_answer. Optional: explanation, page_number.

    JSON: a top-level array of objects with the same fields.
    """
    raw = await file.read()
    filename = (file.filename or "").lower()

    rows: list[dict] = []

    if filename.endswith(".csv"):
        text_data = raw.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text_data))
        for i, row in enumerate(reader, start=2):  # header is line 1
            rows.append(_validate_row(row, i))
    elif filename.endswith(".json"):
        try:
            parsed = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=422, detail=f"Invalid JSON: {e}")
        if not isinstance(parsed, list):
            raise HTTPException(status_code=422, detail="JSON must be an array of MCQ objects")
        for i, row in enumerate(parsed, start=1):
            rows.append(_validate_row(row, i))
    else:
        raise HTTPException(status_code=422, detail="File must be .csv or .json")

    if not rows:
        raise HTTPException(status_code=422, detail="No rows found in file")

    inserted = 0
    try:
        for row in rows:
            db.execute(
                text("""
                    INSERT INTO mcqs (
                        chapter_id, question, option_a, option_b, option_c,
                        option_d, correct_answer, explanation, page_number
                    )
                    VALUES (
                        :chapter_id, :question, :option_a, :option_b, :option_c,
                        :option_d, :correct_answer, :explanation, :page_number
                    )
                """),
                {
                    "chapter_id": chapter_id,
                    "question": row["question"],
                    "option_a": row["option_a"],
                    "option_b": row["option_b"],
                    "option_c": row["option_c"],
                    "option_d": row["option_d"],
                    "correct_answer": row["correct_answer"].strip().upper(),
                    "explanation": row.get("explanation"),
                    "page_number": row.get("page_number") or None,
                },
            )
            inserted += 1
        log_audit(db, _admin.id, "mcqs_bulk_imported", "chapter", chapter_id,
                   metadata={"count": inserted, "filename": file.filename})
        db.commit()
    except Exception:
        db.rollback()
        raise

    return {"success": True, "inserted": inserted, "chapter_id": chapter_id}
