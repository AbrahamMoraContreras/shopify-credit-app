from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import Optional, List, Tuple, Union
from datetime import date, timedelta, datetime
from uuid import UUID
import hashlib
from decimal import Decimal, ROUND_HALF_UP

from models.credit import Credit, CreditStatus
from models.installment import CreditInstallment
from models.history import CreditHistory
from models.customer import Customer
from models.credit_item import CreditItem
from schemas.credit import CreditCreate, CreditUpdate
from crud.customer import get_customer_by_shopify_id, create_customer
from schemas.customer import CustomerCreate
from models.enums import InstallmentStatus

def _merchant_short_hash(merchant_id: str, length: int = 6) -> str:
    h = hashlib.sha1(merchant_id.encode('utf-8')).hexdigest().upper()
    return h[:length]

def _log_history(db: Session, credit_id: int, event: str, description: str = ""):
    h = CreditHistory(credit_id=credit_id, event=event, description=description)
    db.add(h)
    db.commit()

def _generate_installments(total_amount, installments_count, first_due_date, frequency="mensual"):
    total = Decimal(str(total_amount))
    base_amount = (total / installments_count).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    installments = []
    accumulated = Decimal("0.00")
    
    current_due_date = first_due_date
    for i in range(1, installments_count + 1):
        # Increment due date BEFORE adding the installment to the list
        # This aligns with the frontend preview (Today + 1 Period)
        if frequency == "quincenal":
            current_due_date += timedelta(days=15)
        else:
            year = current_due_date.year
            month = current_due_date.month + 1
            if month > 12:
                year += 1
                month = 1
            try:
                current_due_date = date(year, month, current_due_date.day)
            except ValueError:
                import calendar
                last_day = calendar.monthrange(year, month)[1]
                current_due_date = date(year, month, last_day)

        if i == installments_count:
            amount = total - accumulated
        else:
            amount = base_amount
            accumulated += base_amount
        
        installments.append({
            "number": i,
            "amount": float(amount),
            "due_date": current_due_date,
            "status": InstallmentStatus.PENDIENTE
        })

    return installments

def create_credit(db: Session, merchant_id: str, payload: CreditCreate):
    customer = get_customer_by_shopify_id(db=db, shopify_customer_id=payload.customer_id, merchant_id=merchant_id)
    desired_name = payload.customer_name or f"Shopify Customer {payload.customer_id}"
    if not customer:
        placeholder = CustomerCreate(
            full_name=desired_name,
            shopify_customer_id=payload.customer_id,
            email=payload.customer_email,
            merchant_id=merchant_id
        )
        customer = create_customer(db, payload=placeholder)
    else:
        # Update email if missing
        updated = False
        if payload.customer_email and not customer.email:
            customer.email = payload.customer_email
            updated = True
        if payload.customer_name and (customer.full_name.startswith("Shopify Customer") or not customer.full_name):
            customer.full_name = payload.customer_name
            updated = True
        
        if updated:
            db.commit()
            db.refresh(customer)

    credit = Credit(
        merchant_id=merchant_id,
        customer_id=customer.id,
        concept=payload.concept,
        total_amount=payload.total_amount,
        balance=payload.total_amount,
        installments_count=payload.installments_count or 0,
        status=payload.status or CreditStatus.EMITIDO
    )
    db.add(credit)
    db.commit()
    db.refresh(credit)

    # 4) Installments items
    if payload.items:
        for item_data in payload.items:
            db.add(CreditItem(
                credit_id=credit.id,
                product_id=item_data.product_id,
                product_code=item_data.product_code,
                product_name=item_data.product_name,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
            ))
        db.commit()

    _log_history(db, credit.id, "CREDITO_CREADO", f"Total {credit.total_amount} con {len(payload.items)} productos")

    if credit.installments_count > 0:
        if not payload.first_due_date:
            raise ValueError("first_due_date required when installments_count > 0")
        installments_data = _generate_installments(
            total_amount=credit.total_amount,
            installments_count=credit.installments_count,
            first_due_date=payload.first_due_date,
            frequency=payload.frequency or "mensual"
        )
        for inst in installments_data:
            db.add(CreditInstallment(
                credit_id=credit.id,
                number=inst["number"],
                amount=inst["amount"],
                due_date=inst["due_date"],
                status=inst["status"]
            ))
        db.commit()
        _log_history(db, credit.id, "CUOTAS_GENERADAS", f"{credit.installments_count} cuotas generadas automáticamente")
    return credit

def get_credit(db: Session, credit_id: int) -> Optional[Credit]:
    return db.query(Credit).options(
        joinedload(Credit.items),
        joinedload(Credit.customer),
        joinedload(Credit.installments),
        selectinload(Credit.payments)
    ).filter(Credit.id == credit_id).first()

def list_credits(
    db: Session,
    merchant_id: UUID,
    skip: int = 0,
    limit: int = 50,
    status: Optional[Union[CreditStatus, List[CreditStatus]]] = None,
    customer_id: Optional[int] = None,
    credit_id: Optional[int] = None,
    created_at_date: Optional[date] = None
) -> Tuple[List[Credit], int]:
    query = db.query(Credit).options(joinedload(Credit.customer)).filter(Credit.merchant_id == merchant_id)
    if status:
        if isinstance(status, list):
            query = query.filter(Credit.status.in_(status))
        else:
            query = query.filter(Credit.status == status)
    if customer_id:
        query = query.join(Credit.customer).filter(
            (Credit.customer_id == customer_id) | (Customer.shopify_customer_id == str(customer_id))
        )
    if credit_id:
        query = query.filter(Credit.id == credit_id)
    if created_at_date:
        query = query.filter(func.date(Credit.created_at) == created_at_date)
    total = query.count()
    items = query.order_by(Credit.id.desc()).offset(skip).limit(limit).all()
    return items, total

def update_credit(db: Session, credit: Credit, payload: CreditUpdate):
    data = payload.model_dump(exclude_unset=True)
    for k,v in data.items():
        setattr(credit, k, v)
    db.commit()
    db.refresh(credit)
    _log_history(db, credit.id, "CREDITO_ACTUALIZADO", str(data))
    return credit

def delete_credit(db: Session, credit: Credit):
    db.delete(credit)
    db.commit()

def cancel_credit(db: Session, credit: Credit):
    credit.status = CreditStatus.CANCELADO
    # Cancel pending or overdue installments to stop them from appearing in expected payments
    for inst in credit.installments:
        if inst.status in [InstallmentStatus.PENDIENTE, InstallmentStatus.VENCIDO]:
            inst.status = InstallmentStatus.CANCELADA
    
    _log_history(db, credit.id, "CREDITO_CANCELADO", "El crédito fue cancelado manualmente")
    db.commit()
    db.refresh(credit)
    return credit




