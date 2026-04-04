from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, Enum, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from db.base import Base
from models.enums import PaymentStatus


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("merchant_id", "reference_number", name="uq_payment_reference"),
    )

    id = Column(Integer, primary_key=True, index=True)

    credit_id = Column(
        Integer,
        ForeignKey("credits.id", ondelete="CASCADE"),
        nullable=False
    )

    installment_id = Column(
        Integer,
        ForeignKey("credit_installments.id", ondelete="CASCADE"),
        nullable=True
    )

    amount = Column(Numeric(12, 2), nullable=False)

    reference_number = Column(String, nullable=False)
    payment_method = Column(String, nullable=True)

    status = Column(
        Enum(PaymentStatus, name="paymentstatus", native_enum=True, validate_strings=True),
        nullable=False
    )

    payment_date = Column(DateTime, default=datetime.utcnow)

    # NUEVOS CAMPOS
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(String, nullable=True)
    
    installments_covered = Column(String, nullable=True)
    
    # Reputación crediticia (Guardará 100, 50 o 0 dependiendo de la puntualidad del pago)
    punctuality_value = Column(Numeric(5, 2), nullable=True, default=None)

    merchant_id = Column(UUID(as_uuid=True), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    credit = relationship("Credit", back_populates="payments")
    installment = relationship("CreditInstallment", back_populates="payments")
    payment_tokens = relationship("PaymentToken", back_populates="payment", cascade="all, delete-orphan")
