from sqlalchemy import func, cast, Date
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
from crud.audit import log_audit_action
from crud.customer import get_customer_by_shopify_id, create_customer
from schemas.customer import CustomerCreate
from models.enums import InstallmentStatus

def _merchant_short_hash(merchant_id: str, length: int = 6) -> str:
    h = hashlib.sha1(merchant_id.encode('utf-8')).hexdigest().upper()
    return h[:length]

def _log_history(db: Session, credit_id: int, event: str, description: str = ""):
    h = CreditHistory(credit_id=credit_id, event=event, description=description)
    db.add(h)
    db.flush()

def _generate_installments(total_amount, installments_count, first_due_date, frequency="mensual"):
    total = Decimal(str(total_amount))
    base_amount = (total / installments_count).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    installments = []
    accumulated = Decimal("0.00")
    
    current_due_date = first_due_date
    original_day = first_due_date.day if frequency != "quincenal" else None
    
    for i in range(1, installments_count + 1):
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

        if frequency == "quincenal":
            current_due_date += timedelta(days=15)
        else:
            year = current_due_date.year
            month = current_due_date.month + 1
            if month > 12:
                year += 1
                month = 1
            try:
                # Intenta usar el día original (ej: 31) en el nuevo mes
                current_due_date = date(year, month, original_day)
            except ValueError:
                import calendar
                last_day = calendar.monthrange(year, month)[1]
                current_due_date = date(year, month, last_day)

    return installments

def create_credit(db: Session, merchant_id: str, payload: CreditCreate):
    customer = get_customer_by_shopify_id(db=db, shopify_customer_id=payload.customer_id, merchant_id=merchant_id)
    desired_name = payload.customer_name or "Cliente Shopify"
    if not customer:
        placeholder = CustomerCreate(
            full_name=desired_name,
            shopify_customer_id=payload.customer_id,
            email=payload.customer_email,
            phone=payload.customer_phone,
            merchant_id=merchant_id
        )
        customer = create_customer(db, payload=placeholder)
    else:
        # Actualizar email o telefono si son distintos a Shopify
        updated = False
        if payload.customer_email and customer.email != payload.customer_email:
            customer.email = payload.customer_email
            updated = True
        if payload.customer_phone and customer.phone != payload.customer_phone:
            customer.phone = payload.customer_phone
            updated = True
        if payload.customer_name and customer.full_name != payload.customer_name:
            customer.full_name = payload.customer_name
            updated = True
        
        if updated:
            db.flush()
            db.refresh(customer)

    credit = Credit(
        customer_id=customer.id,
        concept=payload.concept,
        total_amount=payload.total_amount,
        balance=payload.total_amount,
        installments_count=payload.installments_count or 0,
        status=payload.status or CreditStatus.EMITIDO
    )
    db.add(credit)
    db.flush()
    db.refresh(credit)

    # Items del crédito
    if payload.items:
        calculated_total = sum((Decimal(str(item.unit_price)) * Decimal(str(item.quantity))) for item in payload.items)
        if abs(calculated_total - Decimal(str(payload.total_amount))) > Decimal("0.05"):
            raise ValueError(f"La suma de los artículos ({calculated_total}) no coincide con el total_amount ({payload.total_amount}).")

        items_to_add = [
            CreditItem(
                credit_id=credit.id,
                product_id=item_data.product_id,
                product_code=item_data.product_code,
                product_name=item_data.product_name,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
            ) for item_data in payload.items
        ]
        db.add_all(items_to_add)
        db.flush()

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
        installments_to_add = [
            CreditInstallment(
                credit_id=credit.id,
                number=inst["number"],
                amount=inst["amount"],
                due_date=inst["due_date"],
                status=inst["status"]
            ) for inst in installments_data
        ]
        db.add_all(installments_to_add)
        db.flush()
        _log_history(db, credit.id, "CUOTAS_GENERADAS", f"{credit.installments_count} cuotas generadas automáticamente")
        
    log_audit_action(
        db=db,
        merchant_id=merchant_id,
        entity_name="CREDIT",
        action="CREATE_CREDIT",
        entity_id=str(credit.id),
        changes={"total_amount": float(credit.total_amount), "customer": customer.full_name}
    )
    db.commit()
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
    created_at_date: Optional[date] = None,
    customer_name: Optional[str] = None,
    due_date: Optional[date] = None
) -> Tuple[List[Credit], int]:
    query = db.query(Credit).join(Customer, Credit.customer_id == Customer.id).options(joinedload(Credit.customer), selectinload(Credit.installments), selectinload(Credit.payments)).filter(Customer.merchant_id == merchant_id)
    if status:
        if isinstance(status, list):
            query = query.filter(Credit.status.in_(status))
        else:
            query = query.filter(Credit.status == status)
    
    if customer_id or customer_name:
        if customer_id:
            from sqlalchemy import cast, String
            query = query.filter(
                (Credit.customer_id == customer_id) | (cast(Customer.shopify_customer_id, String) == str(customer_id))
            )
        if customer_name:
            query = query.filter(Customer.full_name.ilike(f"%{customer_name}%"))

    if credit_id:
        query = query.filter(Credit.id == credit_id)
    if created_at_date:
        query = query.filter(cast(Credit.created_at, Date) == created_at_date)
    if due_date:
        query = query.join(Credit.installments).filter(CreditInstallment.due_date == due_date)
        
    total = query.count()
    items = query.order_by(Credit.id.desc()).offset(skip).limit(limit).all()
    return items, total

def update_credit(db: Session, credit: Credit, payload: CreditUpdate):
    data = payload.model_dump(exclude_unset=True)
    for k,v in data.items():
        setattr(credit, k, v)
    _log_history(db, credit.id, "CREDITO_ACTUALIZADO", str(data))
    db.commit()
    db.refresh(credit)
    return credit

def cancel_credit(db: Session, credit: Credit):
    # Lock the credit to prevent concurrent modifications
    locked_credit = db.query(Credit).with_for_update().filter(Credit.id == credit.id).first()
    if not locked_credit:
        raise ValueError("Credit not found for cancellation")
        
    # Revertir/cerrar cobros abiertos ligados al crédito
    from crud.payment import review_payment
    from models.enums import PaymentStatus
    from models.payment_token import PaymentToken

    merchant_id = credit.customer.merchant_id
    reminder_payment_ids: list[int] = []
    for p in credit.payments:
        p_status = getattr(p.status, "value", p.status)
        if p_status == "APROBADO":
            review_payment(
                db,
                p.id,
                PaymentStatus.CANCELADO,
                merchant_id,
                notes="Reversión automática por cancelación de crédito",
                auto_commit=False,
            )
        elif p_status == "EN_REVISION":
            review_payment(
                db,
                p.id,
                PaymentStatus.RECHAZADO,
                merchant_id,
                notes="Pago rechazado automáticamente por cancelación de crédito",
                auto_commit=False,
            )
        elif p_status == "REGISTRADO":
            # Intent/recordatorio: anular sin reversión monetaria
            review_payment(
                db,
                p.id,
                PaymentStatus.CANCELADO,
                merchant_id,
                notes="Anulado automáticamente por cancelación de crédito (recordatorio)",
                auto_commit=False,
            )
            reminder_payment_ids.append(p.id)

    # Invalidar links públicos de recordatorio aún no usados
    if reminder_payment_ids:
        db.query(PaymentToken).filter(
            PaymentToken.payment_id.in_(reminder_payment_ids),
            PaymentToken.used_at.is_(None),
        ).update(
            {PaymentToken.expires_at: datetime.utcnow()},
            synchronize_session=False,
        )

    credit.status = CreditStatus.CANCELADO
    # Cancelar cuotas pendientes o vencidas para que no aparezcan en pagos esperados
    for inst in credit.installments:
        if getattr(inst.status, "value", inst.status) in ["PENDIENTE", "VENCIDA", "NO_PAGADA"]:
            inst.status = InstallmentStatus.CANCELADA
    
    _log_history(db, credit.id, "CREDITO_CANCELADO", "El crédito fue cancelado manualmente")
    db.commit()
    db.refresh(credit)
    
    log_audit_action(
        db=db,
        merchant_id=credit.customer.merchant_id,
        entity_name="CREDIT",
        action="CANCEL_CREDIT",
        entity_id=str(credit.id),
        changes={"action": "Credit cancelled"}
    )
    return credit




