import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.base import Base

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shop_domain = Column(String, unique=True, nullable=False)
    access_token = Column(String, nullable=True)

    customers = relationship("Customer", back_populates="merchant")
    payment_settings = relationship("MerchantPaymentSetting", back_populates="merchant", cascade="all, delete-orphan")

