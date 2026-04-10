from fastapi import APIRouter, Depends,Header, HTTPException, Query, Path, status
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from uuid import UUID
from schemas.payment import PaymentResponse
from models.payment import Payment
from core.dependencies import get_db, get_merchant_id
from schemas.credit import CreditCreate, CreditUpdate, CreditResponse, CreditStatus
from crud.credit import (
    create_credit,
    list_credits,
    get_credit,
    update_credit,
    delete_credit,
)


router = APIRouter(prefix="/credits", tags=["Credits"])
@router.post("", response_model=CreditResponse, status_code=status.HTTP_201_CREATED)
def create_credit_endpoint(
    payload: CreditCreate,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    """
    Crea un crédito con o sin cuotas.
    IMPORTANTE: create_credit() DEBE retornar el objeto Credit.
    """
    try:
        credit = create_credit(
            db=db,
            payload=payload,
            merchant_id=merchant_id,
        )


        return credit

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get(
    "",
    response_model=List[CreditResponse],
)
def list_credits_endpoint(
    status: Optional[List[CreditStatus]] = Query(None),
    customer_id: Optional[int] = Query(None),
    customer_name: Optional[str] = Query(None),
    credit_id: Optional[int] = Query(None),
    created_at_date: Optional[date] = Query(None),
    due_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    items, _ = list_credits(
        db=db,
        merchant_id=merchant_id,
        skip=skip,
        limit=limit,
        status=status,
        customer_id=customer_id,
        customer_name=customer_name,
        credit_id=credit_id,
        created_at_date=created_at_date,
        due_date=due_date
    )
    return items


@router.get(
    "/{credit_id}",
    response_model=CreditResponse,
)
def get_credit_endpoint(
    credit_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    credit = get_credit(db, credit_id)

    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")

    if credit.merchant_id != merchant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return credit

@router.get(
    "/payments/by-credit/{credit_id}",
    response_model=list[PaymentResponse]
)
def get_payments_by_credit_id(
    credit_id: int,
    db: Session = Depends(get_db),
):
    payments = (
        db.query(Payment)
        .filter(Payment.credit_id == credit_id)
        .order_by(Payment.payment_date.desc())
        .all()
    )

    return payments




@router.put(
    "/{credit_id}",
    response_model=CreditResponse,
)
def update_credit_endpoint(
    credit_id: int,
    payload: CreditUpdate,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    credit = get_credit(db, credit_id)

    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")

    if credit.merchant_id != merchant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return update_credit(db, credit, payload)


@router.delete("/{credit_id}", tags=["credits"], status_code=status.HTTP_204_NO_CONTENT)
def delete_credit_endpoint(
    credit_id: int,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    credit = get_credit(db, credit_id)

    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")

    if credit.merchant_id != merchant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    delete_credit(db, credit)
    return None

@router.put("/{credit_id}/cancel", response_model=CreditResponse, tags=["credits"])
def cancel_credit_endpoint(
    credit_id: int,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    credit = get_credit(db, credit_id)

    if not credit:
        raise HTTPException(status_code=404, detail="Credit not found")

    if credit.merchant_id != merchant_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if credit.status in [CreditStatus.PAGADO, CreditStatus.CANCELADO]:
        raise HTTPException(status_code=400, detail="El crédito ya está pagado o cancelado")

    from crud.credit import cancel_credit
    return cancel_credit(db, credit)
