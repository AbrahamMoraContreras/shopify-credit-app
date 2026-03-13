import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.base import Base


class PaymentToken(Base):
    __tablename__ = "payment_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), nullable=False)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    customer_email = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    payment = relationship("Payment", back_populates="payment_tokens")
    proof = relationship("PaymentProof", back_populates="token", uselist=False, cascade="all, delete-orphan")


class PaymentProof(Base):
    __tablename__ = "payment_proofs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_id = Column(UUID(as_uuid=True), ForeignKey("payment_tokens.id", ondelete="CASCADE"), nullable=False)
    reference_number = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    notes = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False, default="PENDIENTE")  # PENDIENTE | REVISADO

    token = relationship("PaymentToken", back_populates="proof")
