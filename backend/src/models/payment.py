from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey, Enum, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from db.base import Base
from models.enums import PaymentStatus

# Tabla intermedia para normalizar installments_covered
payment_installments = Table(
    "payment_installments",
    Base.metadata,
    Column("payment_id", Integer, ForeignKey("payments.id", ondelete="CASCADE"), primary_key=True),
    Column("installment_id", Integer, ForeignKey("credit_installments.id", ondelete="CASCADE"), primary_key=True)
)

class Payment(Base):
    __tablename__ = "payments"

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

    reference_number = Column(String, nullable=False) # Eliminamos unique=True para permitir multitenancy
    payment_method = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)

    status = Column(
        Enum(PaymentStatus, name="paymentstatus", native_enum=True, validate_strings=True),
        nullable=False
    )

    payment_date = Column(DateTime, default=datetime.utcnow)

    # NUEVOS CAMPOS
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(String, nullable=True)
    
    # Reputación crediticia (Guardará 100, 50 o 0 dependiendo de la puntualidad del pago)
    punctuality_value = Column(Numeric(5, 2), nullable=True, default=None)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    credit = relationship("Credit", back_populates="payments")
    installment = relationship("CreditInstallment", back_populates="payments")
    payment_tokens = relationship("PaymentToken", back_populates="payment", cascade="all, delete-orphan")
    
    # Nueva relación a las cuotas cubiertas
    covered_installments = relationship(
        "CreditInstallment",
        secondary=payment_installments,
        backref="covering_payments"
    )

    @property
    def merchant_id(self):
        if self.credit and self.credit.customer:
            return self.credit.customer.merchant_id
        return None

    @property
    def installments_covered(self):
        if not self.covered_installments:
            return None
        return ",".join(str(i.id) for i in self.covered_installments)

