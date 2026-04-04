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
