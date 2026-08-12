import json
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    metadata: Optional[dict] = None,
) -> None:
    """
    Fire-and-forget audit trail. Does NOT commit — call this inside the
    same transaction as the action it's recording, so the log entry and
    the action succeed or fail together (an audit log for an action that
    didn't actually happen is worse than no log at all).
    """
    db.execute(
        text("""
            INSERT INTO audit_logs (user_id, action, target_type, target_id, metadata)
            VALUES (:user_id, :action, :target_type, :target_id, :metadata)
        """),
        {
            "user_id": user_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": json.dumps(metadata) if metadata is not None else None,
        },
    )
