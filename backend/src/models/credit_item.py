# app/models/credit_item.py
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship

from db.base import Base


class CreditItem(Base):
    __tablename__ = "credit_items"

    id = Column(Integer, primary_key=True, index=True)

    credit_id = Column(
        Integer,
        ForeignKey("credits.id", ondelete="CASCADE"),
        nullable=False
    )

    # 🔗 Shopify
    product_id = Column(
        String,
        nullable=False,
        index=True,
        comment="Shopify Product ID"
    )

    product_code = Column(
        String,
        nullable=True,
        comment="SKU del producto"
    )

    product_name = Column(
        String,
        nullable=False
    )

    unit_price = Column(
        Numeric(12, 2),
        nullable=False
    )
    
    total_price = Column(Numeric(12, 2), nullable=False)

    quantity = Column(
        Integer,
        nullable=False
    )

    # 🔗 RELACIONES
    credit = relationship(
        "Credit",
        back_populates="items"
    )
