# app/crud/payment.py
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException
from models.installment import CreditInstallment
from models.payment import Payment
from models.credit import Credit
from schemas.payment import PaymentCreate
from models.enums import PaymentStatus, CreditStatus, InstallmentStatus
from models.credit_item import CreditItem
from models.customer import Customer
from crud.cte import credit_items_agg_cte

def update_customer_punctuality(db: Session, customer: Customer):
    # Calcula el promedio de la puntualidad de los pagos aprobados
    avg_score = db.query(func.avg(Payment.punctuality_value)).join(Credit, Credit.id == Payment.credit_id).filter(
        Credit.customer_id == customer.id,
        Payment.status == PaymentStatus.APROBADO,
        Payment.punctuality_value.isnot(None)
    ).scalar()
    
    # avg_score can be None if there are no eligible payments
    if avg_score is not None:
        customer.punctuality_score = Decimal(str(avg_score))
    else:
        customer.punctuality_score = None

def get_payment_with_products(
    db: Session,
    payment_id: int,
    merchant_id: UUID
):
    payment = (
        db.query(Payment)
        .filter(
            Payment.id == payment_id,
            Payment.merchant_id == merchant_id
        )
        .first()
    )

    if not payment:
        return None

    items = (
        db.query(CreditItem)
        .filter(CreditItem.credit_id == payment.credit_id)
        .all()
    )

    products = [
        {
            "product_id": item.product_id,
            "product_code": item.product_code,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": item.quantity * item.unit_price,
        }
        for item in items
    ]

    return payment, products

def get_payment_with_credit(
    db: Session,
    payment_id: int,
    merchant_id: UUID,
):
    payment = (
        db.query(Payment)
        .options(
            joinedload(Payment.credit)
            .joinedload("items")  # Credit.items
        )
        .filter(
            Payment.id == payment_id,
            Payment.merchant_id == merchant_id
        )
        .first()
    )

    if not payment:
        raise ValueError("Payment not found")

    return payment

def get_payment_by_id(
    db: Session,
    payment_id: int,
    merchant_id: UUID
) -> Payment | None:
    return (
        db.query(Payment)
        .options(
            joinedload(Payment.credit)
            .joinedload(Credit.items)
        )
        .filter(
            Payment.id == payment_id,
            Payment.merchant_id == merchant_id
        )
        .first()
    )

def create_payment(
    db: Session,
    payload: PaymentCreate,
    merchant_id,
):
    credit_id = payload.credit_id
    credit = db.get(Credit, credit_id)

    if not credit: raise ValueError("Credit not found")
    if str(credit.merchant_id) != str(merchant_id):
        raise ValueError("El crédito no pertenece a este merchant")

    payment_punctuality = payload.punctuality_feedback
    if payment_punctuality is not None:
        payment_punctuality = Decimal(str(payment_punctuality))

    installments_covered_str = ",".join(map(str, payload.apply_to_installments)) if payload.apply_to_installments else None
    
    notes = payload.notes or ""
    if payload.distribute_excess:
        notes = f"[DISTRIBUTE_EXCESS] {notes}".strip()

    payload_amount = Decimal(str(payload.amount))

    # --- SALDO A FAVOR LOGIC ---
    if payload.use_favorable_balance:
        customer = credit.customer
        if not customer:
            raise ValueError("No se encontró el cliente asociado al crédito.")

        favorable = Decimal(str(customer.favorable_balance))
        if favorable <= Decimal("0.00"):
            raise ValueError("El cliente no tiene Saldo a Favor disponible.")

        # If paying with favorable balance, we only consume what we asked for, or up to what is available
        amount_to_apply = min(favorable, payload_amount)

        customer.favorable_balance -= amount_to_apply

        payment = Payment(
            merchant_id=merchant_id,
            credit_id=credit.id,
            amount=amount_to_apply,
            payment_method=payload.payment_method,
            reference_number=payload.reference_number,
            status=PaymentStatus.APROBADO,
            payment_date=datetime.utcnow(),
            notes=notes if notes else "Pago aplicado desde Saldo a Favor.",
            punctuality_value=payment_punctuality,
            installments_covered=installments_covered_str
        )
        
        try:
            db.add(payment)
            db.commit()
            db.refresh(payment)
        except Exception as e:
            db.rollback()
            if "uq_payment_reference" in str(e) or "reference_number" in str(e).lower():
                raise ValueError("El número de referencia ya ha sido utilizado para este comercio.")
            raise e

        # Since it's approved immediately, assign funds
        _apply_payment_distribution(db, payment, credit, payload.apply_to_installments, payload.distribute_excess, customer)
        
    else:
        payment = Payment(
            merchant_id=merchant_id,
            credit_id=credit.id,
            amount=payload_amount,
            payment_method=payload.payment_method,
            reference_number=payload.reference_number,
            status=PaymentStatus.EN_REVISION,
            payment_date=datetime.utcnow(),
            notes=notes,
            punctuality_value=payment_punctuality,
            installments_covered=installments_covered_str
        )
        try:
            db.add(payment)
            db.commit()
            db.refresh(payment)
        except Exception as e:
            db.rollback()
            if "uq_payment_reference" in str(e) or "reference_number" in str(e).lower():
                raise ValueError("El número de referencia ya ha sido utilizado para este comercio.")
            raise e

    return payment


def _apply_payment_distribution(db: Session, payment: Payment, credit: Credit, target_installment_ids: list[int], distribute_excess: bool, customer: Customer):
    """
    Distributes an APROBADO payment's amount across the credit and installments.
    """
    initial_balance = Decimal(str(credit.balance))
    payment_amount = Decimal(str(payment.amount))
    
    pending_installments = db.query(CreditInstallment).filter(
        CreditInstallment.credit_id == credit.id,
        CreditInstallment.paid == False
    ).order_by(
        CreditInstallment.number == 0,
        CreditInstallment.due_date.asc().nulls_last()
    ).all()
    
    target_installments = [i for i in pending_installments if i.id in target_installment_ids]
    other_installments = [i for i in pending_installments if i.id not in target_installment_ids]
    
    target_debt = sum([Decimal(str(i.amount)) - Decimal(str(i.paid_amount)) for i in target_installments])
    
    amount_to_apply_to_credit = payment_amount
    excess_for_favorable_balance = Decimal("0.00")
    
    # 1. Determine Overflow Behavior
    # Check for explicit [OVERPAYMENT: X] annotation in payment notes (set by public submission)
    import re
    overpayment_match = re.search(r'\[OVERPAYMENT: ([\d.]+)\]', payment.notes or "")
    if overpayment_match:
        excess_for_favorable_balance = Decimal(overpayment_match.group(1))
        amount_to_apply_to_credit = payment_amount - excess_for_favorable_balance
        # Cap at credit balance
        if amount_to_apply_to_credit > initial_balance:
            excess_for_favorable_balance += amount_to_apply_to_credit - initial_balance
            amount_to_apply_to_credit = initial_balance
    elif credit.installments_count == 0:
        # Fiado (No installments): Only cap by the initial_balance
        if initial_balance < payment_amount:
            amount_to_apply_to_credit = initial_balance
            excess_for_favorable_balance = payment_amount - initial_balance
    else:
        # Installment-based credit
        if not distribute_excess and payment_amount > target_debt:
            amount_to_apply_to_credit = target_debt
            excess_for_favorable_balance = payment_amount - target_debt
        elif initial_balance < payment_amount:
            amount_to_apply_to_credit = initial_balance
            excess_for_favorable_balance = payment_amount - initial_balance

    # 2. Update Balances
    credit.balance -= amount_to_apply_to_credit
    if customer and excess_for_favorable_balance > Decimal("0.00"):
        customer.favorable_balance += excess_for_favorable_balance

    # 3. Queue Installments
    distribution_queue = target_installments
    if distribute_excess:
        distribution_queue.extend(other_installments)
        
    remaining_to_distribute = amount_to_apply_to_credit

    # 4. Drain the Remaining Funds into Installments (if any)
    for inst in distribution_queue:
        if remaining_to_distribute <= Decimal("0.00"):
            break
            
        inst_debt = Decimal(str(inst.amount)) - Decimal(str(inst.paid_amount))
        
        if inst_debt <= remaining_to_distribute:
            # Cuota pagada por completo
            remaining_to_distribute -= inst_debt
            inst.paid_amount = inst.amount
            inst.paid = True
            inst.status = InstallmentStatus.PAGADA
            inst.paid_at = datetime.utcnow()
        else:
            # Pago parcial
            inst.paid_amount += remaining_to_distribute
            remaining_to_distribute = Decimal("0.00")
            
    # Última actualización del status del crédito
    # Even if there were no installments (Fiado), `credit.balance` was already reduced in Step 2 above.
    if credit.balance <= 0:
        credit.balance = Decimal("0.00")
        credit.status = CreditStatus.PAGADO
    else:
        credit.status = CreditStatus.EN_PROGRESO


def review_payment(
    db: Session,
    payment_id: int,
    status: PaymentStatus,
    reviewer_id,
    notes: str | None = None,
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=400, detail="Pago no encontrado")

    if payment.status == status:
        return payment

    credit = db.query(Credit).filter(Credit.id == payment.credit_id).first()
    if not credit:
        raise HTTPException(status_code=400, detail="Crédito no encontrado")

    # --- REVERSAL LOGIC ---
    if payment.status == PaymentStatus.APROBADO:
        # Reversing a bulk payment is extremely complex because it scattered amounts across multiple installments.
        # En una arquitectura real usaríamos ledger/transactions. Aquí, para simplificar, si se revierte:
        # 1. Devolvemos el monto original al balance (y si restamos saldo a favor, lo descontamos).
        # 2. Hacemos que todas las cuotas marcadas en `installments_covered` vuelvan a 0.
        # ESTO ES UN WORKAROUND SIMPLE, SOLO MANTENER DE PRECAUCIÓN. (Si se necesita anular parciales, es otra historia)
        amount_to_reverse = Decimal(str(payment.amount))
        
        target_ids = []
        if payment.installments_covered:
            target_ids = [int(x.strip()) for x in payment.installments_covered.split(",") if x.strip()]
            
        covered_installments = db.query(CreditInstallment).filter(CreditInstallment.id.in_(target_ids)).all()
        for inst in covered_installments:
            inst.paid = False
            inst.status = InstallmentStatus.PENDIENTE
            inst.paid_amount = Decimal("0.00")
            inst.paid_at = None
            
        # Asume que si sobró plata, fue a Saldo a Favor
        distribute_excess = "[DISTRIBUTE_EXCESS]" in (payment.notes or "")
        target_debt = sum([Decimal(str(i.amount)) for i in covered_installments]) # Original debt
        
        excess = Decimal("0.00")
        if not distribute_excess and amount_to_reverse > target_debt:
            excess = amount_to_reverse - target_debt
        elif amount_to_reverse > (credit.balance + amount_to_reverse): # Aproximación si se pasó del total general
             pass
             
        credit.balance += (amount_to_reverse - excess)
        if credit.customer and excess > Decimal("0.00"):
            credit.customer.favorable_balance -= excess
            if credit.customer.favorable_balance < Decimal("0.00"):
                credit.customer.favorable_balance = Decimal("0.00")

        if credit.status == CreditStatus.PAGADO and credit.balance > 0:
            credit.status = CreditStatus.EN_PROGRESO

    # --- APPLY NEW STATUS ---
    payment.status = status
    payment.reviewed_at = datetime.utcnow()
    payment.reviewed_by = reviewer_id
    if notes:
        payment.notes = notes

    if status == PaymentStatus.APROBADO:
        distribute_excess = "[DISTRIBUTE_EXCESS]" in (payment.notes or "")
        target_ids = []
        if payment.installments_covered:
            target_ids = [int(x.strip()) for x in payment.installments_covered.split(",") if x.strip()]
            
        _apply_payment_distribution(db, payment, credit, target_ids, distribute_excess, credit.customer)

    db.commit()
    db.refresh(payment)
    
    if credit.customer:
        update_customer_punctuality(db, credit.customer)
        db.commit()
        db.refresh(credit.customer)
        
    return payment

def batch_review_payments(
    db: Session,
    payment_ids: list[int],
    status: PaymentStatus,
    reviewer_id: UUID
):
    results = []
    for pid in payment_ids:
        try:
            p = review_payment(db, pid, status, reviewer_id)
            results.append(p)
        except Exception as e:
            print(f"Error reviewing payment {pid}: {e}")
            continue
    return results

def batch_delete_payments(
    db: Session,
    payment_ids: list[int],
    merchant_id: UUID
):
    payments = db.query(Payment).filter(
        Payment.id.in_(payment_ids),
        Payment.merchant_id == merchant_id
    ).all()
    
    for p in payments:
        # If it was approved, reverse it before deleting!
        if p.status == PaymentStatus.APROBADO:
            review_payment(db, p.id, PaymentStatus.RECHAZADO, merchant_id, notes="Automatic reversal due to deletion")
        
        db.delete(p)
    
    db.commit()
    return len(payments)


def list_payments(
    db: Session,
    merchant_id: UUID,
    limit: int = 20,
    offset: int = 0,
):
    products_cte = credit_items_agg_cte(db)

    q = (
        db.query(
            Payment.id,
            Payment.credit_id,
            Payment.amount,
            Payment.status,
            Payment.reference_number,
            Payment.installments_covered,
            Payment.payment_date,
            Customer.full_name.label("customer_name"),
            Customer.email.label("customer_email"),
            Credit.total_amount.label("credit_total_amount"),
            Credit.balance.label("credit_balance"),
            Customer.favorable_balance.label("customer_favorable_balance"),

            func.coalesce(products_cte.c.items_count, 0).label("products_items"),
            func.coalesce(products_cte.c.total_quantity, 0).label("products_quantity"),
            func.coalesce(products_cte.c.products_total, Decimal("0.00")).label("products_total"),
        )
        .join(Credit, Credit.id == Payment.credit_id)
        .join(Customer, Customer.id == Credit.customer_id)
        .outerjoin(
            products_cte,
            products_cte.c.credit_id == Payment.credit_id
        )
        .filter(Payment.merchant_id == merchant_id)
        .order_by(Payment.payment_date.desc())
        .limit(limit)
        .offset(offset)
    )

    return q.all()
