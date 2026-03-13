import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_name = Column(String, index=True, nullable=False)
    entity_id = Column(String, index=True, nullable=False)
    action = Column(String, index=True, nullable=False)  # "CREATE" or "DELETE"
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Store the actual data of the entity being created or deleted
    # We use JSONB for PostgreSQL to allow flexible querying if needed
    changes = Column(JSONB, nullable=True)

    # Optional: If we want to track who did it (if merchant_id or user_id is available in context)
    # merchant_id = Column(UUID(as_uuid=True), nullable=True)
