# app/crud/payment.py
from sqlalchemy import func, cast, Date, String
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from datetime import datetime, date
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
from crud.audit import log_audit_action

def update_customer_punctuality(db: Session, customer: Customer):
    # Calcula el promedio de la puntualidad de los pagos aprobados o marcados como NO_PAGADO
    avg_score = db.query(func.avg(Payment.punctuality_value)).join(Credit, Credit.id == Payment.credit_id).filter(
        Credit.customer_id == customer.id,
        Payment.status.in_([PaymentStatus.APROBADO, PaymentStatus.NO_PAGADO]),
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
        .join(Payment.credit)
        .join(Credit.customer)
        .filter(
            Payment.id == payment_id,
            Customer.merchant_id == merchant_id
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
        .join(Payment.credit)
        .join(Credit.customer)
        .filter(
            Payment.id == payment_id,
            Customer.merchant_id == merchant_id
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
        .join(Payment.credit)
        .join(Credit.customer)
        .filter(
            Payment.id == payment_id,
            Customer.merchant_id == merchant_id
        )
        .first()
    )

def create_payment(
    db: Session,
    payload: PaymentCreate,
    merchant_id,
):
    credit_id = payload.credit_id
    credit = db.query(Credit).with_for_update().filter(Credit.id == credit_id).first()

    if not credit: raise ValueError("Credit not found")
    if str(credit.customer.merchant_id) != str(merchant_id):
        raise ValueError("El crédito no pertenece a este merchant")

    payment_punctuality = payload.punctuality_feedback
    if payment_punctuality is not None:
        payment_punctuality = Decimal(str(payment_punctuality))

    covered_installments = []
    if payload.apply_to_installments:
        covered_installments = db.query(CreditInstallment).filter(
            CreditInstallment.id.in_(payload.apply_to_installments),
            CreditInstallment.credit_id == credit.id
        ).all()
    
    notes = payload.notes or ""

    payload_amount = Decimal(str(payload.amount))

    # Logica de saldo a favor
    favorable_payment = None
    if payload.use_favorable_balance:
        customer = db.query(Customer).with_for_update().filter(Customer.id == credit.customer_id).first()
        if not customer:
            raise ValueError("No se encontró el cliente asociado al crédito.")

        favorable = Decimal(str(customer.favorable_balance))
        if favorable > Decimal("0.00"):
            credit_debt = sum([Decimal(str(i.amount)) - Decimal(str(i.paid_amount)) for i in credit.installments]) if credit.installments_count > 0 else Decimal(str(credit.balance))
            
            # Usar saldo a favor hasta cubrir la deuda o agotar el saldo
            favorable_to_use = min(favorable, credit_debt)
            if favorable_to_use > Decimal("0.00"):
                customer.favorable_balance -= favorable_to_use
                log_audit_action(
                    db=db,
                    merchant_id=customer.merchant_id,
                    entity_name="CUSTOMER_BALANCE",
                    action="ADJUST_BALANCE",
                    entity_id=str(customer.id),
                    changes={
                        "amount_changed": float(favorable_to_use),
                        "action": "SUBTRACT",
                        "reason": f"Uso de saldo a favor para el crédito #{credit.id}",
                        "new_balance": float(customer.favorable_balance)
                    }
                )

                favorable_note = "Pago aplicado desde Saldo a Favor."
                final_notes = f"{notes}\n{favorable_note}".strip() if notes else favorable_note
                favorable_payment = Payment(
                    credit_id=credit.id,
                    amount=favorable_to_use,
                    payment_method="Saldo a Favor",
                    reference_number=f"FAVORABLE-{int(payload.payment_date.timestamp())}-{credit.id}",
                    status=PaymentStatus.APROBADO,
                    payment_date=payload.payment_date.replace(tzinfo=None),
                    notes=final_notes,
                    punctuality_value=payment_punctuality,
                    covered_installments=covered_installments
                )
                
                db.add(favorable_payment)
                db.flush()
                _apply_payment_distribution(db, favorable_payment, credit, payload.apply_to_installments, payload.distribute_excess, customer)
                # BUGFIX: Ensure punctuality score is calculated for Saldo a Favor
                update_customer_punctuality(db, customer)
                db.commit()
                db.refresh(credit)

    # Lógica de dinero nuevo
    new_money_payment = None
    if payload_amount > Decimal("0.00"):
        new_money_payment = Payment(
            credit_id=credit.id,
            amount=payload_amount,
            payment_method=payload.payment_method,
            reference_number=payload.reference_number,
            status=PaymentStatus.EN_REVISION,
            payment_date=payload.payment_date.replace(tzinfo=None),
            notes=notes,
            punctuality_value=payment_punctuality,
            covered_installments=covered_installments
        )
        try:
            db.add(new_money_payment)
            db.flush()
            log_audit_action(
                db=db,
                merchant_id=merchant_id,
                entity_name="PAYMENT",
                action="REGISTER_PAYMENT",
                entity_id=str(new_money_payment.id),
                changes={"amount": float(new_money_payment.amount), "credit_id": credit.id, "status": new_money_payment.status}
            )
            db.commit()
            db.refresh(new_money_payment)
        except Exception as e:
            db.rollback()
            if "uq_payment_reference" in str(e) or "reference_number" in str(e).lower():
                raise ValueError("El número de referencia ya ha sido utilizado para este comercio.")
            raise e

    if not favorable_payment and not new_money_payment:
        credit_debt_val = credit_debt if 'credit_debt' in locals() else Decimal("0.00")
        if credit_debt_val <= Decimal("0.00") and payload.use_favorable_balance:
            raise ValueError("El crédito seleccionado ya no posee deuda pendiente o sus cuotas ya están pagadas.")
        raise ValueError("El monto del pago debe ser mayor a 0 o debe haber saldo a favor disponible.")

    return new_money_payment or favorable_payment


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

    if credit.installments_count == 0:
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

    # Evitar montos negativos
    if amount_to_apply_to_credit < Decimal("0.00"):
        amount_to_apply_to_credit = Decimal("0.00")

    # Actualizar balances
    credit.balance -= amount_to_apply_to_credit
    if customer and excess_for_favorable_balance > Decimal("0.00"):
        customer.favorable_balance += excess_for_favorable_balance
        
        log_audit_action(
            db=db,
            merchant_id=customer.merchant_id,
            entity_name="CUSTOMER_BALANCE",
            action="ADJUST_BALANCE",
            entity_id=str(customer.id),
            changes={
                "amount_changed": float(excess_for_favorable_balance),
                "action": "ADD",
                "reason": f"Excedente de pago del crédito #{credit.id}",
                "new_balance": float(customer.favorable_balance)
            }
        )

        import re
        current_notes = payment.notes or ""
        current_notes = re.sub(r'\[OVERPAYMENT:.*?\]', '', current_notes).strip()
        payment.notes = f"{current_notes}\n[OVERPAYMENT: {excess_for_favorable_balance}]".strip()

    # Colas de cuotas
    distribution_queue = target_installments
    if distribute_excess:
        distribution_queue.extend(other_installments)
        
    remaining_to_distribute = amount_to_apply_to_credit

    # Distribuir el resto de los fondos en las cuotas si existen
    fully_paid_installments: list[CreditInstallment] = []
    
    epsilon = Decimal("0.01")  # Tolerancia para problemas de precisión decimal

    for inst in distribution_queue:
        if remaining_to_distribute <= Decimal("0.00"):
            break
            
        inst_debt = Decimal(str(inst.amount)) - Decimal(str(inst.paid_amount))
        
        # Consideramos la cuota como totalmente pagada si la diferencia es virtualmente nula
        if inst_debt <= remaining_to_distribute + epsilon:
            # Cuota pagada por completo
            if inst_debt <= remaining_to_distribute:
                remaining_to_distribute -= inst_debt
            else:
                remaining_to_distribute = Decimal("0.00")
            
            inst.paid_amount = inst.amount
            inst.status = InstallmentStatus.PAGADA
            inst.paid_at = datetime.utcnow()
            fully_paid_installments.append(inst)
        else:
            # Pago parcial
            inst.paid_amount += remaining_to_distribute
            remaining_to_distribute = Decimal("0.00")

    # Calcular la puntualidad para créditos basados en cuotas (mensuales/quincenales).
    # Solo se ejecuta cuando el crédito tiene cuotas y punctuality_value no se estableció manualmente (ej: feedback de Fiado).
    # Regla: payment_date (fecha de registro del pago) vs due_date más temprana cubierta.
    payment_date_only = payment.payment_date.date() if payment.payment_date else datetime.utcnow().date()

    if credit.installments_count > 0 and payment.punctuality_value is None:
        covered_due_dates = []
        for inst in distribution_queue:
            if inst.id in target_installment_ids or inst in fully_paid_installments:
                covered_due_dates.append(inst.due_date)
                
        valid_due_dates = [d for d in covered_due_dates if d is not None]
        if valid_due_dates:
            earliest_due = min(valid_due_dates)
            payment.punctuality_value = Decimal("100") if payment_date_only <= earliest_due else Decimal("0")

    # Última actualización del status del crédito (con margen de error de hasta 0.10$)
    if credit.balance <= Decimal("0.10"):
        credit.balance = Decimal("0.00")
        credit.status = CreditStatus.PAGADO
        
        # Al pagarse totalmente, cancelar cualquier intento de pago pendiente que haya sobrado
        db.query(Payment).filter(
            Payment.credit_id == credit.id,
            Payment.id != payment.id,
            Payment.status.in_([PaymentStatus.REGISTRADO, PaymentStatus.EN_REVISION])
        ).update({"status": PaymentStatus.CANCELADO}, synchronize_session=False)
        
        # Y asegurarnos de que TODAS las cuotas restantes queden en PAGADA
        db.query(CreditInstallment).filter(
            CreditInstallment.credit_id == credit.id,
            CreditInstallment.status != InstallmentStatus.PAGADA
        ).update({
            "status": InstallmentStatus.PAGADA,
            "paid_amount": CreditInstallment.amount,
            "paid_at": datetime.utcnow()
        }, synchronize_session=False)
        
    else:
        # Morosidad relativa a la fecha de registro del pago (no a "hoy").
        from services.morosity import apply_morosity_from_payment_date
        apply_morosity_from_payment_date(db, credit, payment_date_only)


def review_payment(
    db: Session,
    payment_id: int,
    status: PaymentStatus,
    reviewer_id,
    notes: str | None = None,
    auto_commit: bool = True,
):
    payment = db.query(Payment).with_for_update().filter(Payment.id == payment_id).first()

    if not payment:
        raise HTTPException(status_code=400, detail="Pago no encontrado")

    if payment.status == status:
        return payment

    credit = db.query(Credit).with_for_update().filter(Credit.id == payment.credit_id).first()
    if not credit:
        raise HTTPException(status_code=400, detail="Crédito no encontrado")

    # LÓGICA DE REVERSIÓN
    if payment.status == PaymentStatus.APROBADO:
        amount_to_reverse = Decimal(str(payment.amount))
        
        import re
        overpayment_match = re.search(r'\[OVERPAYMENT: ([\d.]+)\]', payment.notes or "")
        if overpayment_match:
            excess_to_revert = Decimal(overpayment_match.group(1))
        else:
            excess_to_revert = Decimal("0.00")
            
        amount_to_credit = amount_to_reverse - excess_to_revert

        # 1. Revertir balance del crédito
        credit.balance += amount_to_credit

        # 2. Revertir saldo a favor del cliente
        if credit.customer:
            if excess_to_revert > Decimal("0.00"):
                credit.customer.favorable_balance -= excess_to_revert
                log_audit_action(
                    db=db,
                    merchant_id=credit.customer.merchant_id,
                    entity_name="CUSTOMER_BALANCE",
                    action="ADJUST_BALANCE",
                    entity_id=str(credit.customer.id),
                    changes={
                        "amount_changed": float(excess_to_revert),
                        "action": "SUBTRACT",
                        "reason": f"Reversión de excedente del pago #{payment.id} (Crédito #{credit.id})",
                        "new_balance": float(credit.customer.favorable_balance)
                    }
                )
                    
            if payment.payment_method == "Saldo a Favor" or (payment.notes and "Pago aplicado desde Saldo a Favor" in payment.notes):
                credit.customer.favorable_balance += amount_to_reverse
                log_audit_action(
                    db=db,
                    merchant_id=credit.customer.merchant_id,
                    entity_name="CUSTOMER_BALANCE",
                    action="ADJUST_BALANCE",
                    entity_id=str(credit.customer.id),
                    changes={
                        "amount_changed": float(amount_to_reverse),
                        "action": "ADD",
                        "reason": f"Reversión de pago hecho con saldo a favor #{payment.id} (Crédito #{credit.id})",
                        "new_balance": float(credit.customer.favorable_balance)
                    }
                )

        # 3. Restar el monto pagado de las cuotas afectadas (hasta agotar amount_to_credit)
        remaining_to_unpay = amount_to_credit
        
        # Primero intentar restar de las cuotas explícitamente marcadas
        for inst in reversed(payment.covered_installments):
            if remaining_to_unpay <= Decimal("0.00"):
                break
            take_back = min(Decimal(str(inst.paid_amount)), remaining_to_unpay)
            inst.paid_amount = Decimal(str(inst.paid_amount)) - take_back
            remaining_to_unpay -= take_back
            
            if inst.paid_amount < Decimal(str(inst.amount)):
                # Provisional; refresh_credit_morosity ajusta VENCIDA vs PENDIENTE con payment_date
                inst.status = InstallmentStatus.PENDIENTE
                inst.paid_at = None

        # Si aún queda monto por revertir (ej: porque se distribuyó el exceso a otras cuotas), restar de otras cuotas activas
        if remaining_to_unpay > Decimal("0.00"):
            other_insts = db.query(CreditInstallment).filter(
                CreditInstallment.credit_id == credit.id,
                CreditInstallment.paid_amount > Decimal("0.00")
            ).order_by(CreditInstallment.number.desc()).all()
            
            for inst in other_insts:
                if remaining_to_unpay <= Decimal("0.00"):
                    break
                take_back = min(Decimal(str(inst.paid_amount)), remaining_to_unpay)
                inst.paid_amount = Decimal(str(inst.paid_amount)) - take_back
                remaining_to_unpay -= take_back
                
                if inst.paid_amount < Decimal(str(inst.amount)):
                    inst.status = InstallmentStatus.PENDIENTE
                    inst.paid_at = None

        was_approved_before = True
    else:
        was_approved_before = False

    payment.status = status
    payment.reviewed_at = datetime.utcnow()
    payment.reviewed_by = reviewer_id
    if notes:
        payment.notes = notes

    if status == PaymentStatus.APROBADO:
        distribute_excess = "[DISTRIBUTE_EXCESS]" in (payment.notes or "")
        target_ids = [inst.id for inst in payment.covered_installments]
        
        if not target_ids and payment.installment_id:
            target_ids = [payment.installment_id]
            
        _apply_payment_distribution(db, payment, credit, target_ids, distribute_excess, credit.customer)
    elif status == PaymentStatus.NO_PAGADO:
        for inst in payment.covered_installments:
            inst.status = InstallmentStatus.NO_PAGADA
        if payment.punctuality_value is None:
            payment.punctuality_value = Decimal("0")
    elif status == PaymentStatus.RECHAZADO:
        # `proof` es una relación SQLAlchemy (PaymentProof), no un booleano.
        # Al rechazar, marcar el comprobante como revisado para sacarlo de pendientes.
        pt = db.query(PaymentToken).filter(PaymentToken.payment_id == payment.id).first()
        if pt and pt.proof is not None:
            pt.proof.status = "REVISADO"

    # Tras revertir un pago aprobado, recalcular mora con payment_date de los APROBADOS restantes
    if was_approved_before and status != PaymentStatus.APROBADO:
        from services.morosity import refresh_credit_morosity
        db.flush()
        refresh_credit_morosity(db, credit)

    log_audit_action(
        db=db,
        merchant_id=credit.customer.merchant_id,
        entity_name="PAYMENT",
        action="REVIEW_PAYMENT",
        entity_id=str(payment.id),
        changes={"status": status}
    )
    if auto_commit:
        db.commit()
        db.refresh(payment)
    else:
        db.flush()
    
    if credit.customer:
        update_customer_punctuality(db, credit.customer)
        if auto_commit:
            db.commit()
            db.refresh(credit.customer)
        else:
            db.flush()
        
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
    payments = (
        db.query(Payment)
        .join(Payment.credit)
        .join(Credit.customer)
        .filter(
            Payment.id.in_(payment_ids),
            Customer.merchant_id == merchant_id
        ).all()
    )
    
    for p in payments:
        # Si fue aprobado revierte antes de cancelar
        if p.status == PaymentStatus.APROBADO:
            review_payment(db, p.id, PaymentStatus.CANCELADO, merchant_id, notes="Reversión automática debido a eliminación masiva", auto_commit=False)
        else:
            p.status = PaymentStatus.CANCELADO
            p.notes = f"{p.notes or ''} | Cancelado masivamente".strip()
            
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
    payment_id: int | None = None,
    credit_id: int | None = None,
    customer_id: int | None = None,
    customer_name: str | None = None,
    payment_date: date | None = None,
    status: PaymentStatus | None = None,
):
    products_cte = credit_items_agg_cte(db)
    
    from models.payment import payment_installments
    installments_sq = (
        db.query(
            payment_installments.c.payment_id,
            func.string_agg(cast(payment_installments.c.installment_id, String), ',').label('installments_covered')
        )
        .group_by(payment_installments.c.payment_id)
        .subquery()
    )

    q = (
        db.query(
            Payment.id,
            Payment.credit_id,
            Payment.amount,
            Payment.status,
            Payment.reference_number,
            installments_sq.c.installments_covered,
            Payment.payment_date,
            Payment.payment_method,
            Payment.bank_name,
            Customer.full_name.label("customer_name"),
            Customer.email.label("customer_email"),
            Credit.total_amount.label("credit_total_amount"),
            Credit.balance.label("credit_balance"),
            Customer.favorable_balance.label("customer_favorable_balance"),

            func.coalesce(products_cte.c.items_count, 0).label("products_items"),
            func.coalesce(products_cte.c.total_quantity, 0).label("products_quantity"),
            func.coalesce(products_cte.c.products_total, Decimal("0.00")).label("products_total"),
            Payment.punctuality_value,
        )
        .join(Credit, Credit.id == Payment.credit_id)
        .join(Customer, Customer.id == Credit.customer_id)
        .outerjoin(
            products_cte,
            products_cte.c.credit_id == Payment.credit_id
        )
        .outerjoin(
            installments_sq,
            installments_sq.c.payment_id == Payment.id
        )
        .filter(Customer.merchant_id == merchant_id)
    )

    if payment_id is not None:
        q = q.filter(Payment.id == payment_id)
    if credit_id is not None:
        q = q.filter(Payment.credit_id == credit_id)
    if customer_id is not None:
        q = q.filter(
            (Customer.id == customer_id) | (cast(Customer.shopify_customer_id, String) == str(customer_id))
        )
    if customer_name:
        q = q.filter(Customer.full_name.ilike(f"%{customer_name}%"))
    if payment_date:
        q = q.filter(cast(Payment.payment_date, Date) == payment_date)
    if status is not None:
        q = q.filter(Payment.status == status)
        
    q = q.order_by(Payment.payment_date.desc(), Payment.id.desc()).limit(limit).offset(offset)

    return q.all()
