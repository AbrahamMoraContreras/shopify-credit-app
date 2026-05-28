from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from db.base import Base
from sqlalchemy.dialects.postgresql import UUID

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    # NUEVO — Merchant que es dueño del cliente
    merchant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("merchants.id"),
        nullable=False,
        index=True
    )

    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True)

    # Shopify integration
    shopify_customer_id = Column(BigInteger, nullable=True, index=True)
    favorable_balance = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    # Puntualidad (0.00 a 100.00 %)
    punctuality_score = Column(Numeric(5, 2), nullable=True, default=None)

    # Relaciones
    merchant = relationship("Merchant", back_populates="customers")
    credits = relationship("Credit", back_populates="customer")

    @property
    def reputation(self) -> str:
        if self.punctuality_score is None:
            return "sin_historial"
        score = float(self.punctuality_score)
        if score >= 90.0:
            return "excelente"
        elif score >= 70.0:
            return "buena"
        elif score >= 40.0:
            return "regular"
        else:
            return "mala"

    @property
    def credits_completed(self) -> int:
        """Créditos con status PAGADO."""
        return sum(
            1 for c in self.credits
            if getattr(c.status, "value", c.status) == "PAGADO"
        )

    @property
    def credits_incomplete(self) -> int:
        """Créditos activos (no PAGADO ni CANCELADO)."""
        active_statuses = {"PENDIENTE_ACTIVACION", "EMITIDO", "EN_PROGRESO", "MOROSO"}
        return sum(
            1 for c in self.credits
            if getattr(c.status, "value", c.status) in active_statuses
        )

    @property
    def payments_on_time(self) -> int:
        """Pagos APROBADO con punctuality_value == 100 (a tiempo)."""
        from decimal import Decimal
        count = 0
        for c in self.credits:
            for p in c.payments:
                if (getattr(p.status, "value", p.status) == "APROBADO"
                        and p.punctuality_value is not None
                        and Decimal(str(p.punctuality_value)) == Decimal("100")):
                    count += 1
        return count

    @property
    def payments_late(self) -> int:
        """Pagos APROBADO con punctuality_value == 0 (tardíos)."""
        from decimal import Decimal
        count = 0
        for c in self.credits:
            for p in c.payments:
                if (getattr(p.status, "value", p.status) == "APROBADO"
                        and p.punctuality_value is not None
                        and Decimal(str(p.punctuality_value)) == Decimal("0")):
                    count += 1
        return count
