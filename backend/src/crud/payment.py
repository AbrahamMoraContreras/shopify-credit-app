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
from models.payment_token import PaymentToken

def update_customer_punctuality(db: Session, customer: Customer):
    # Calcula el promedio de la puntualidad de los pagos aprobados
    avg_score = db.query(func.avg(Payment.punctuality_value)).join(Credit, Credit.id == Payment.credit_id).filter(
        Credit.customer_id == customer.id,
        Payment.status == PaymentStatus.APROBADO,
        Payment.punctuality_value.isnot(None)
    ).scalar()
    
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
    from sqlalchemy.orm import selectinload
    return (
        db.query(Payment)
        .options(
            joinedload(Payment.credit)
            .joinedload(Credit.items),
            joinedload(Payment.credit).joinedload(Credit.customer),
            selectinload(Payment.payment_tokens).joinedload(PaymentToken.proof)
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

    # Logica de saldo a favor
    if payload.use_favorable_balance:
        customer = credit.customer
        if not customer:
            raise ValueError("No se encontró el cliente asociado al crédito.")

        favorable = Decimal(str(customer.favorable_balance))
        if favorable <= Decimal("0.00"):
            raise ValueError("El cliente no tiene Saldo a Favor disponible.")

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
    Also auto-computes punctuality_value for installment-based credits (monthly/biweekly)
    by comparing payment_date against the earliest covered installment's due_date.
    """
    initial_balance = Decimal(str(credit.balance))
    payment_amount = Decimal(str(payment.amount))
    
    pending_installments = db.query(CreditInstallment).filter(
        CreditInstallment.credit_id == credit.id,
        CreditInstallment.status != InstallmentStatus.PAGADA
    ).order_by(
        CreditInstallment.number == 0,
        CreditInstallment.due_date.asc().nulls_last()
    ).all()
    
    target_installments = [i for i in pending_installments if i.id in target_installment_ids]
    other_installments = [i for i in pending_installments if i.id not in target_installment_ids]
    
    target_debt = sum([Decimal(str(i.amount)) - Decimal(str(i.paid_amount)) for i in target_installments])
    
    amount_to_apply_to_credit = payment_amount
    excess_for_favorable_balance = Decimal("0.00")

    import re
    overpayment_match = re.search(r'\[OVERPAYMENT: ([\d.]+)\]', payment.notes or "")
    if overpayment_match:
        excess_for_favorable_balance = Decimal(overpayment_match.group(1))
        amount_to_apply_to_credit = payment_amount - excess_for_favorable_balance

        if amount_to_apply_to_credit > initial_balance:
            excess_for_favorable_balance += amount_to_apply_to_credit - initial_balance
            amount_to_apply_to_credit = initial_balance
    elif credit.installments_count == 0:
        # Fiado (Sin cuotas): Solo limitar por el saldo inicial
        if initial_balance < payment_amount:
            amount_to_apply_to_credit = initial_balance
            excess_for_favorable_balance = payment_amount - initial_balance
    else:
        # Crédito basado en cuotas
        if not distribute_excess and payment_amount > target_debt:
            amount_to_apply_to_credit = target_debt
            excess_for_favorable_balance = payment_amount - target_debt
        elif initial_balance < payment_amount:
            amount_to_apply_to_credit = initial_balance
            excess_for_favorable_balance = payment_amount - initial_balance

    # Actualizar balances
    credit.balance -= amount_to_apply_to_credit
    if customer and excess_for_favorable_balance > Decimal("0.00"):
        customer.favorable_balance += excess_for_favorable_balance

    # Colas de cuotas
    distribution_queue = target_installments
    if distribute_excess:
        distribution_queue.extend(other_installments)
        
    remaining_to_distribute = amount_to_apply_to_credit

    # Distribuir el resto de los fondos en las cuotas si existen
    fully_paid_installments: list[CreditInstallment] = []
    for inst in distribution_queue:
        if remaining_to_distribute <= Decimal("0.00"):
            break
            
        inst_debt = Decimal(str(inst.amount)) - Decimal(str(inst.paid_amount))
        
        if inst_debt <= remaining_to_distribute:
            # Cuota pagada por completo
            remaining_to_distribute -= inst_debt
            inst.paid_amount = inst.amount
            inst.status = InstallmentStatus.PAGADA
            inst.paid_at = datetime.utcnow()
            fully_paid_installments.append(inst)
        else:
            # Pago parcial
            inst.paid_amount += remaining_to_distribute
            remaining_to_distribute = Decimal("0.00")

    # Calcular la puntualidad para créditos basados en cuotas (mensuales/quincenales).
    # Solo se ejecuta cuando: al menos una cuota fue pagada por completo, el crédito tiene cuotas,
    # y punctuality_value no se estableció manualmente (por ejemplo, retroalimentación de Fiado).
    if fully_paid_installments and credit.installments_count > 0 and payment.punctuality_value is None:
        payment_date_only = payment.payment_date.date() if payment.payment_date else datetime.utcnow().date()
        # Usar la fecha de vencimiento más temprana entre las cuotas pagadas como referencia
        covered_due_dates = [
            inst.due_date
            for inst in fully_paid_installments
        ]
        valid_due_dates = [d for d in covered_due_dates if d is not None]
        if valid_due_dates:
            earliest_due = min(valid_due_dates)
            payment.punctuality_value = Decimal("100") if payment_date_only <= earliest_due else Decimal("0")

    # Última actualización del status del crédito
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

    # LÓGICA DE REVERSIÓN
    if payment.status == PaymentStatus.APROBADO:
        # Devolvemos el monto original al balance (y si restamos saldo a favor, lo descontamos).
        # Hacemos que todas las cuotas marcadas en `installments_covered` vuelvan a 0.
        amount_to_reverse = Decimal(str(payment.amount))
        
        target_ids = []
        if payment.installments_covered:
            target_ids = [int(x.strip()) for x in payment.installments_covered.split(",") if x.strip()]
            
        covered_installments = db.query(CreditInstallment).filter(CreditInstallment.id.in_(target_ids)).all()
        for inst in covered_installments:
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
        # Si fue aprobado revierte antes de eliminar
        if p.status == PaymentStatus.APROBADO:
            review_payment(db, p.id, PaymentStatus.RECHAZADO, merchant_id, notes="Reversión automática debido a eliminación")
        
        db.delete(p)
    
    db.commit()
    return len(payments)


def delete_all_pending_proofs(
    db: Session,
    merchant_id: UUID
):
    from models.payment_token import PaymentProof, PaymentToken
    
    # Obtener todas las pruebas pendientes para este merchant
    proofs_to_delete = (
        db.query(PaymentProof)
        .join(PaymentToken, PaymentProof.token_id == PaymentToken.id)
        .filter(
            PaymentToken.merchant_id == merchant_id,
            PaymentProof.status == "PENDIENTE"
        )
        .all()
    )
    
    count = len(proofs_to_delete)
    for p in proofs_to_delete:
        db.delete(p)
    
    db.commit()
    return count


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
