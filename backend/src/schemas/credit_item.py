from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class CreditItemBase(BaseModel):
    product_id: str
    product_code: Optional[str] = None
    product_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal

class CreditItemCreate(CreditItemBase):
    pass

class CreditItemResponse(CreditItemBase):
    id: int
    credit_id: int

    model_config = {"from_attributes": True}
