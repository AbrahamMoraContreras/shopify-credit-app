import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    merchant_id = Column(UUID(as_uuid=True), index=True, nullable=True) # made nullable=True just in case of old records, but we probably enforce it
    entity_name = Column(String, index=True, nullable=False)
    entity_id = Column(String, index=True, nullable=False)
    action = Column(String, index=True, nullable=False)  # "CREATE" or "DELETE"
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Almacena los datos reales de la entidad que se está creando o eliminando
    # Se usa JSONB para PostgreSQL para permitir consultas flexibles si es necesario
    changes = Column(JSONB, nullable=True)
