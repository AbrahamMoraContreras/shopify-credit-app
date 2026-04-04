import uuid
from datetime import datetime
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, Numeric, String, Enum as SAEnum, ForeignKey, DateTime
)
from sqlalchemy.orm import relationship
from db.base import Base
from models.enums import CreditStatus

class Credit(Base):
    __tablename__ = "credits"

    id = Column(Integer, primary_key=True, index=True)

    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)

    concept = Column(String, nullable=False)

    total_amount = Column(Numeric(12, 2), nullable=False)
    balance = Column(Numeric(12, 2), nullable=False)

    installments_count = Column(Integer, nullable=False, default=1)

    status = Column(
        SAEnum(CreditStatus, name="creditstatus", native_enum=True),
        nullable=False,
        default=CreditStatus.PENDIENTE_ACTIVACION,
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="credits")

    installments = relationship(
        "CreditInstallment",
        back_populates="credit",
        cascade="all, delete-orphan"
    )

    items = relationship(
        "CreditItem",
        back_populates="credit",
        cascade="all, delete-orphan"
    )

    payments = relationship(
    "Payment",
    back_populates="credit",
    cascade="all, delete-orphan"
)

    history = relationship(
        "CreditHistory",
        back_populates="credit",
        cascade="all, delete-orphan"
    )

    @property
    def last_payment_amount(self):
        from decimal import Decimal
        # Filtrar pagos relacionados para APROBADO
        approved = [p for p in self.payments if getattr(p.status, "value", p.status) == "APROBADO"]
        if not approved:
            return Decimal("0.00")
        last_p = sorted(approved, key=lambda p: p.payment_date, reverse=True)[0]
        return last_p.amount

    @property
    def last_payment_notes(self):
        approved = [p for p in self.payments if getattr(p.status, "value", p.status) == "APROBADO"]
        if not approved:
            return None
        last_p = sorted(approved, key=lambda p: p.payment_date, reverse=True)[0]
        return last_p.notes

    @property
    def last_payment_date(self):
        approved = [p for p in self.payments if getattr(p.status, "value", p.status) == "APROBADO"]
        if not approved:
            return None
        last_p = sorted(approved, key=lambda p: p.payment_date, reverse=True)[0]
        return last_p.payment_date

    @property
    def last_payment_method(self):
        approved = [p for p in self.payments if getattr(p.status, "value", p.status) == "APROBADO"]
        if not approved:
            return None
        last_p = sorted(approved, key=lambda p: p.payment_date, reverse=True)[0]
        return last_p.payment_method

    @property
    def last_payment_reference(self):
        approved = [p for p in self.payments if getattr(p.status, "value", p.status) == "APROBADO"]
        if not approved:
            return None
        last_p = sorted(approved, key=lambda p: p.payment_date, reverse=True)[0]
        return last_p.reference_number
