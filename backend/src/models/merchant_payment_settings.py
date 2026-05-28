import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.schema import ForeignKey
from db.base import Base

class MerchantPaymentSetting(Base):
    __tablename__ = "merchant_payment_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Ejemplo: "pago_movil", "transferencia", "binance", etc.
    method_name = Column(String, nullable=False)
    
    # Configuración estructurada en JSON
    settings_data = Column(JSONB, nullable=True)

    merchant = relationship("Merchant", back_populates="payment_settings")
