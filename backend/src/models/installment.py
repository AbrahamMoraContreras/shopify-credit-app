from sqlalchemy import Column, Integer, Numeric, Date, ForeignKey, Enum, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import date, datetime

from db.base import Base
from models.enums import InstallmentStatus

class CreditInstallment(Base):
    __tablename__ = "credit_installments"

    id = Column(Integer, primary_key=True, index=True)

    credit_id = Column(
        Integer,
        ForeignKey("credits.id", ondelete="CASCADE"),
        nullable=False
    )

    number = Column(Integer, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    due_date = Column(Date, nullable=True)

    status = Column(
        Enum(InstallmentStatus, name="installmentstatus", native_enum=True),
        nullable=False,
        default=InstallmentStatus.PENDIENTE
    )

    paid = Column(Boolean, nullable=False, default=False)
    paid_amount = Column(Numeric(12, 2), nullable=False, default=0)
    paid_at = Column(DateTime, nullable=True)

    # 🔗 RELACIONES
    credit = relationship("Credit", back_populates="installments")
    payments = relationship(
        "Payment",
        back_populates="installment",
        cascade="all, delete-orphan"
    )
