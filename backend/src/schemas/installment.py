from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from models.enums import InstallmentStatus


class InstallmentBase(BaseModel):
    id: int
    number: int
    amount: Decimal
    due_date: Optional[date] = None
    status: InstallmentStatus

    model_config = {
        "from_attributes": True
    }


class InstallmentResponse(InstallmentBase):
    paid: bool = False
    paid_amount: Decimal = Decimal("0.00")
    paid_at: Optional[datetime] = None
    reference_number: Optional[str] = None
