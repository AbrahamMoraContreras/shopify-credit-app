# app/api/routes/payments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from core.dependencies import get_db, get_merchant_id
from core.config import settings
from schemas.payment import PaymentCreate, PaymentResponse, PaymentReview, PaymentDetailResponse
from crud.payment import (
    create_payment, 
    get_payment_with_products, 
    list_payments, 
    review_payment, 
    get_payment_by_id,
    batch_review_payments,
    batch_delete_payments
)
from schemas.payment_list import PaymentListItem
from schemas.batch_payment import BatchReviewRequest, BatchDeleteRequest

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment_endpoint(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    try:
        return create_payment(
            db=db,
            payload=payload,
            merchant_id=merchant_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("", response_model=list[PaymentListItem])
def get_payments(
    payment_id: int | None = None,
    credit_id: int | None = None,
    customer_name: str | None = None,
    payment_date: date | None = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    return list_payments(
        db=db, 
        merchant_id=merchant_id, 
        limit=limit, 
        offset=offset,
        payment_id=payment_id,
        credit_id=credit_id,
        customer_name=customer_name,
        payment_date=payment_date
    )



@router.patch("/batch-review")
def batch_review_endpoint(
    payload: BatchReviewRequest,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    return batch_review_payments(
        db=db,
        payment_ids=payload.payment_ids,
        status=payload.status,
        reviewer_id=merchant_id
    )

@router.post("/batch-delete")
def batch_delete_endpoint(
    payload: BatchDeleteRequest,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    count = batch_delete_payments(
        db=db,
        payment_ids=payload.payment_ids,
        merchant_id=merchant_id
    )
    return {"deleted_count": count}


from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import datetime, date
from models.credit import Credit
from models.installment import CreditInstallment
from models.customer import Customer
from models.enums import InstallmentStatus, CreditStatus

class ExpectedPaymentResponse(BaseModel):
    credit_id: int
    installment_id: Optional[int]
    customer_name: str
    customer_email: Optional[str] = None
    installment_number: Optional[int]
    due_date: Optional[date]
    expected_amount: float
    status: str

@router.get("/expected", response_model=List[ExpectedPaymentResponse], summary="Listar pagos esperados (cuotas pendientes o vencidas)")
def get_expected_payments(
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    installments = (
        db.query(CreditInstallment)
        .join(Credit, CreditInstallment.credit_id == Credit.id)
        .join(Customer, Credit.customer_id == Customer.id)
        .filter(
            Credit.merchant_id == merchant_id,
            CreditInstallment.status.in_([InstallmentStatus.PENDIENTE, InstallmentStatus.VENCIDO])
        )
        .order_by(CreditInstallment.due_date.asc())
        .all()
    )
    
    result = []
    
    for inst in installments:
        credit = inst.credit
        customer = credit.customer
        result.append(ExpectedPaymentResponse(
            credit_id=credit.id,
            installment_id=inst.id,
            customer_name=customer.full_name,
            customer_email=customer.email,
            installment_number=inst.number,
            due_date=inst.due_date,
            expected_amount=float(inst.amount) - float(inst.paid_amount),
            status=inst.status.value,
        ))

    fiados = (
        db.query(Credit)
        .join(Customer, Credit.customer_id == Customer.id)
        .filter(
            Credit.merchant_id == merchant_id,
            Credit.installments_count == 0,
            Credit.balance > 0,
            Credit.status.in_([CreditStatus.EN_PROGRESO, CreditStatus.EMITIDO])
        )
        .all()
    )

    for fiado in fiados:
        customer = fiado.customer
        result.append(ExpectedPaymentResponse(
            credit_id=fiado.id,
            installment_id=None,
            customer_name=customer.full_name,
            customer_email=customer.email,
            installment_number=None,
            due_date=None, 
            expected_amount=float(fiado.balance),
            status="PENDIENTE"
        ))

    return result


from models.payment_token import PaymentToken, PaymentProof
from models.payment import Payment
from models.credit import Credit
from services.email import send_payment_reminder
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timedelta
import uuid as _uuid
import os


from decimal import Decimal
from models.enums import PaymentStatus

class TokenCreateRequest(BaseModel):
    credit_id: int
    installment_id: Optional[int] = None
    amount: float
    customer_email: str
    expires_hours: int = 72


@router.post("/payment-tokens", summary="Generar token de recordatorio para un pago")
def create_payment_token(
    payload: TokenCreateRequest,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    credit = db.query(Credit).filter(Credit.id == payload.credit_id).first()
    if not credit:
        raise HTTPException(status_code=404, detail="Crédito no encontrado.")
        
    if credit.merchant_id != merchant_id:
        raise HTTPException(status_code=403, detail="Acceso denegado al crédito.")

    intent = Payment(
        merchant_id=merchant_id,
        credit_id=payload.credit_id,
        installment_id=payload.installment_id,
        amount=Decimal(str(payload.amount)),
        payment_method="Link de Pago",
        reference_number=f"INTENT-{str(_uuid.uuid4())[:8].upper()}",
        status=PaymentStatus.REGISTRADO,
        payment_date=datetime.utcnow(),
        notes="Intención de pago generada vía link de cobro"
    )
    db.add(intent)
    db.commit()
    db.refresh(intent)

    token_str = str(_uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(hours=payload.expires_hours)

    pt = PaymentToken(
        token=token_str,
        payment_id=intent.id,
        merchant_id=merchant_id,
        customer_email=payload.customer_email,
        expires_at=expires_at,
    )
    db.add(pt)
    
    if credit.customer and not credit.customer.email:
        credit.customer.email = payload.customer_email
        db.add(credit.customer)

    db.commit()
    db.refresh(pt)

    payment_url = f"{settings.PUBLIC_PAGE_URL}?token={token_str}"

    installment_number = None
    if payload.installment_id:
        inst = next((i for i in credit.installments if i.id == payload.installment_id), None)
        installment_number = inst.number if inst else None

    send_payment_reminder(
        to_email=payload.customer_email,
        customer_name=credit.customer.full_name if credit.customer else "Cliente",
        installment_number=installment_number,
        amount=payload.amount,
        due_date=None,
        payment_url=payment_url,
    )

    return {"token": token_str, "url": payment_url, "expires_at": expires_at.isoformat()}


class PaymentProofResponse(BaseModel):
    id: int
    status: str
    submitted_at: Optional[datetime]
    reference_number: str
    bank_name: str
    amount: float
    notes: Optional[str]
    customer_email: Optional[str]
    customer_name: Optional[str]
    payment_id: int
    credit_id: Optional[int]

@router.get("/payment-proofs", summary="Listar comprobantes pendientes de revisión", response_model=List[PaymentProofResponse])
def list_payment_proofs(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    query = db.query(PaymentProof).join(PaymentToken, PaymentProof.token_id == PaymentToken.id).filter(PaymentToken.merchant_id == merchant_id)
    
    if status:
        query = query.filter(PaymentProof.status == status)
        
    proofs = query.order_by(PaymentProof.submitted_at.desc()).all()
    result = []
    for p in proofs:
        pt = p.token
        if not pt:
            continue
            
        payment = db.query(Payment).filter(Payment.id == pt.payment_id).first()
        credit = db.query(Credit).filter(Credit.id == payment.credit_id).first() if payment else None
        
        result.append({
            "id": p.id,
            "status": p.status,
            "submitted_at": p.submitted_at,
            "reference_number": p.reference_number,
            "bank_name": p.bank_name,
            "amount": float(p.amount),
            "notes": p.notes,
            "customer_email": pt.customer_email if pt and pt.customer_email else "Sin email",
            "customer_name": credit.customer.full_name if credit and credit.customer else "Cliente Desconocido",
            "payment_id": pt.payment_id,
            "credit_id": payment.credit_id if payment else None,
        })
    return result


@router.patch("/payment-proofs/{proof_id}/mark-reviewed", summary="Marcar comprobante como revisado")
def mark_proof_reviewed(
    proof_id: int,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    proof = db.query(PaymentProof).filter(PaymentProof.id == proof_id).first()
    if not proof:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado.")
    proof.status = "REVISADO"
    db.commit()
    return {"ok": True}

@router.delete("/payment-proofs", summary="Vaciar todos los comprobantes pendientes")
def clear_pending_proofs(
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    from crud.payment import delete_all_pending_proofs
    count = delete_all_pending_proofs(db, merchant_id)
    return {"deleted_count": count}


@router.get("/{payment_id}", response_model=PaymentDetailResponse)
def get_payment_detail(
    payment_id: int,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    payment = get_payment_by_id(
        db=db,
        payment_id=payment_id,
        merchant_id=merchant_id,
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Pago no encontrado"
        )
    
    proof = None
    if payment.payment_tokens:
        for pt in payment.payment_tokens:
            if pt.proof:
                proof = pt.proof
                break

    return {
        "id": payment.id,
        "merchant_id": payment.merchant_id,
        "credit_id": payment.credit_id,
        "installment_id": payment.installment_id,
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "reference_number": payment.reference_number,
        "status": payment.status,
        "payment_date": payment.payment_date,
        "reviewed_at": payment.reviewed_at,
        "reviewed_by": payment.reviewed_by,
        "notes": payment.notes,
        "installments_covered": payment.installments_covered,
        "created_at": payment.created_at,
        "updated_at": payment.updated_at,
        "credit": payment.credit,
        "proof": proof
    }

@router.patch("/{payment_id}/review", response_model=PaymentResponse)
def review_payment_endpoint(
    payment_id: int,
    payload: PaymentReview,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    try:
        return review_payment(
            db=db,
            payment_id=payment_id,
            status=payload.status,
            notes=payload.notes,
            reviewer_id=merchant_id
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
