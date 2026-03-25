from pydantic import BaseModel, computed_field
from typing import Optional
from decimal import Decimal

class CreditItemBase(BaseModel):
    product_id: str
    product_code: Optional[str] = None
    product_name: str
    quantity: int
    unit_price: Decimal

    @computed_field
    @property
    def total_price(self) -> Decimal:
        """Calculado automáticamente: unit_price * quantity."""
        return self.unit_price * self.quantity

class CreditItemCreate(CreditItemBase):
    pass

class CreditItemResponse(CreditItemBase):
    id: int
    credit_id: int

    model_config = {"from_attributes": True}
