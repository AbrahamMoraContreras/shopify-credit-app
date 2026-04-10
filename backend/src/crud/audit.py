# app/crud/audit.py
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
from models.audit_log import AuditLog
import json

def log_audit_action(
    db: Session,
    merchant_id: UUID,
    entity_name: str,
    action: str, # "LOGIN", "CREATE", "UPDATE", "DELETE", "CANCEL"
    entity_id: str = "N/A",
    changes: dict = None
):
    try:
        log = AuditLog(
            merchant_id=merchant_id,
            entity_name=entity_name,
            entity_id=entity_id,
            action=action,
            timestamp=datetime.utcnow(),
            changes=changes
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error saving audit log: {e}")
