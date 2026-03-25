from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum
from models.enums import PaymentStatus
from schemas.credit import CreditResponse
class PaymentMethod(str, Enum):
    BANK = "BANK"
    PAYPAL = "PAYPAL"
    PAGO_MOVIL = "PAGO_MOVIL"

class PaymentCreditItem(BaseModel):
    product_id: Optional[str] = None
    product_code: Optional[str] = None
    product_name: str
    quantity: int
    unit_price: float
    total_price: float

    model_config = {"from_attributes": True}

class CustomerSummary(BaseModel):
    full_name: str
    email: Optional[str] = None

    model_config = {"from_attributes": True}

class CreditSummary(BaseModel):
    id: int
    total_amount: Decimal
    balance: Decimal
    concept: str
    customer: Optional[CustomerSummary] = None
    items: List[PaymentCreditItem] = []

    model_config = {"from_attributes": True}

class PaymentCreditSummary(BaseModel):
    credit_id: int
    total_amount: float
    balance: float
    items: List[PaymentCreditItem]

    model_config = {"from_attributes": True}


class PaymentBase(BaseModel):
    credit_id: int
    amount: Decimal
    bank_sender: Optional[str] = None
    document_id_sender: Optional[str] = None
    installment_id: Optional[int] = None
    receipt_pdf_path: Optional[str] = None
    payment_method: str = Field(
        ...,
        example="transferencia",
        description="Método de pago utilizado por el cliente"
    )
    reference_number: str = Field(
        ...,
        example="REF-998123",
        description="Número de referencia bancaria"
    )
    payment_date: datetime = Field(
        ...,
        example="2025-11-20T10:30:00"
    )

class PaymentCreate(BaseModel):
    credit_id: int
    apply_to_installments: List[int] = []
    distribute_excess: bool = False
    amount: float
    payment_method: PaymentMethod  # BANK | PAYPAL | PAGO_MOVIL
    reference_number: str
    payment_date: datetime
    use_favorable_balance: bool = False
    notes: Optional[str] = None
    punctuality_feedback: Optional[float] = Field(None, description="100=Puntual, 50=Retrasado, 0=No pago (Para Fiados)")
    model_config = {"from_attributes" : True}


class PaymentReview(BaseModel):
    status: PaymentStatus = Field(
        ...,
        description="Resultado de la validación del pago"
    )

    notes: Optional[str] = Field(
        None,
        example="Validado contra estado bancario"
    )

class PaymentResponse(BaseModel):
    id: int
    merchant_id: UUID
    credit_id: int
    installment_id: Optional[int]
    amount: Decimal
    payment_method: str
    reference_number: str
    status: PaymentStatus

    payment_date: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[UUID]
    notes: Optional[str]
    installments_covered: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
class PaymentProofResponse(BaseModel):
    id: int
    status: str
    submitted_at: datetime
    reference_number: str
    bank_name: str
    amount: float
    notes: Optional[str] = None

    model_config = {"from_attributes": True}

class PaymentDetailResponse(PaymentResponse):
    credit: CreditSummary
    proof: Optional[PaymentProofResponse] = None

    model_config = {"from_attributes": True}
