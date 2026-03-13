from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
from models.enums import PaymentStatus

class PaymentListItem(BaseModel):
    id: int
    credit_id: int
    amount: Decimal
    status: PaymentStatus
    reference_number: str
    installments_covered: Optional[str] = None
    payment_date: datetime
    customer_name: str
    customer_email: Optional[str] = None
    credit_total_amount: Decimal
    credit_balance: Decimal
    customer_favorable_balance: Decimal

    products_items: int
    products_quantity: int
    products_total: Decimal

    model_config = {"from_attributes": True}
