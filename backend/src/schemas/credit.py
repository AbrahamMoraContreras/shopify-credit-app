# app/schemas/credit.py
from decimal import Decimal
from schemas.credit_item import CreditItemResponse
from schemas.installment import InstallmentResponse
from models.enums import CreditStatus
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date, datetime
import uuid

# -------- Credit --------
class CreditBase(BaseModel):
    customer_id: int
    concept: str
    total_amount: Decimal


from schemas.credit_item import CreditItemResponse, CreditItemCreate

class CreditCreate(BaseModel):
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    concept: str
    total_amount: Decimal
    installments_count: int
    first_due_date: Optional[date] = None
    frequency: Optional[str] = None  # "quincenal" | "mensual"
    status: Optional[CreditStatus] = None
    items: List[CreditItemCreate] = []



class CreditUpdate(BaseModel):
    status: Optional[CreditStatus] = None
    concept: Optional[str] = None


from schemas.customer import CustomerResponse

class CreditResponse(BaseModel):
    id: int
    customer_id: int
    merchant_id: uuid.UUID
    concept: str
    total_amount: Decimal
    balance: Decimal
    last_payment_amount: Optional[Decimal] = None
    last_payment_notes: Optional[str] = None
    installments_count: int
    status: CreditStatus
    created_at: datetime
    customer: Optional[CustomerResponse] = None
    installments: List[InstallmentResponse] = []
    items: List[CreditItemResponse] = []
    model_config = ConfigDict(from_attributes=True)
