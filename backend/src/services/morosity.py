"""Morosity rules:

1) Calendar (on-demand sync): PENDIENTE + due_date < today → VENCIDA; credit → MOROSO.
   Only promotes; never clears calendar-overdue rows by itself.

2) Payment date (on approve/revert): due_date < min(payment_date, today) → VENCIDA.
   When demoting, never clear a cuota that is still overdue vs today
   (so calendar mora coexists with payment_date mora).
   payment_date after today is capped so late payment of cuota N does not
   mark still-future cuotas as VENCIDA.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from models.credit import Credit
from models.customer import Customer
from models.enums import CreditStatus, InstallmentStatus, PaymentStatus
from models.installment import CreditInstallment
from models.payment import Payment


def _as_date(value: date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value[:10])
    return value


def _status_value(status) -> str:
    return getattr(status, "value", status)


def _is_terminal_installment(status_val: str) -> bool:
    return status_val in (
        InstallmentStatus.PAGADA.value,
        InstallmentStatus.CANCELADA.value,
        InstallmentStatus.NO_PAGADA.value,
    )


def apply_morosity_from_payment_date(
    db: Session,
    credit: Credit,
    reference_date: date,
    *,
    today: date | None = None,
) -> None:
    """
    Update unpaid installment statuses using the payment's registered date,
    while preserving calendar overdue (due_date < today).

    - overdue vs min(payment_date, today) OR vs today → VENCIDA
    - otherwise → PENDIENTE
    - any VENCIDA → credit MOROSO (unless paid/cancelled)
    """
    if credit.status == CreditStatus.CANCELADO:
        return

    if Decimal(str(credit.balance)) <= Decimal("0.10"):
        credit.balance = Decimal("0.00")
        credit.status = CreditStatus.PAGADO
        return

    if not credit.installments_count:
        credit.status = CreditStatus.EN_PROGRESO
        return

    today = today or date.today()
    # No inventar mora futura: si payment_date > hoy, evaluar como máximo contra hoy.
    # Así pagar una cuota atrasada con fecha posterior no marca VENCIDA cuotas aún no vencidas en calendario.
    effective_ref = min(reference_date, today)
    has_overdue = False
    installments = (
        db.query(CreditInstallment)
        .filter(CreditInstallment.credit_id == credit.id)
        .all()
    )

    for inst in installments:
        status_val = _status_value(inst.status)
        if _is_terminal_installment(status_val):
            continue

        due = _as_date(inst.due_date)
        overdue_vs_payment = bool(due and due < effective_ref)
        overdue_vs_today = bool(due and due < today)

        if overdue_vs_payment or overdue_vs_today:
            inst.status = InstallmentStatus.VENCIDA
            has_overdue = True
        else:
            inst.status = InstallmentStatus.PENDIENTE

    credit.status = CreditStatus.MOROSO if has_overdue else CreditStatus.EN_PROGRESO


def apply_calendar_morosity_for_credit(
    db: Session,
    credit: Credit,
    *,
    today: date | None = None,
) -> int:
    """Apply calendar mora on one credit. Returns count of newly marked VENCIDA."""
    if credit.status in (CreditStatus.CANCELADO, CreditStatus.PAGADO):
        return 0

    if Decimal(str(credit.balance)) <= Decimal("0.10"):
        credit.balance = Decimal("0.00")
        credit.status = CreditStatus.PAGADO
        return 0

    if not credit.installments_count:
        return 0

    today = today or date.today()
    updated = 0
    has_vencida = False

    installments = (
        db.query(CreditInstallment)
        .filter(CreditInstallment.credit_id == credit.id)
        .all()
    )

    for inst in installments:
        status_val = _status_value(inst.status)
        if _is_terminal_installment(status_val):
            continue

        due = _as_date(inst.due_date)
        if due and due < today:
            if status_val != InstallmentStatus.VENCIDA.value:
                inst.status = InstallmentStatus.VENCIDA
                updated += 1
            has_vencida = True
        elif status_val == InstallmentStatus.VENCIDA.value:
            # Due date is no longer in the past
            inst.status = InstallmentStatus.PENDIENTE

        if _status_value(inst.status) == InstallmentStatus.VENCIDA.value:
            has_vencida = True

    if has_vencida:
        credit.status = CreditStatus.MOROSO
    elif credit.status == CreditStatus.MOROSO:
        credit.status = CreditStatus.EN_PROGRESO

    return updated


def refresh_credit_morosity(db: Session, credit: Credit) -> None:
    """
    Recompute morosity from the latest approved payment's payment_date.
    If there is no approved payment, fall back to calendar rules (today).
    """
    if credit.status == CreditStatus.CANCELADO:
        return

    if Decimal(str(credit.balance)) <= Decimal("0.10"):
        credit.balance = Decimal("0.00")
        credit.status = CreditStatus.PAGADO
        return

    latest = (
        db.query(Payment)
        .filter(
            Payment.credit_id == credit.id,
            Payment.status == PaymentStatus.APROBADO,
        )
        .order_by(Payment.payment_date.desc(), Payment.id.desc())
        .first()
    )

    ref = _as_date(latest.payment_date) if latest else None
    if ref is None:
        apply_calendar_morosity_for_credit(db, credit)
        if not credit.installments_count and credit.status not in (
            CreditStatus.PAGADO,
            CreditStatus.CANCELADO,
        ):
            credit.status = CreditStatus.EN_PROGRESO
        return

    apply_morosity_from_payment_date(db, credit, ref)


def sync_calendar_morosity(
    db: Session,
    merchant_id: UUID,
    *,
    today: date | None = None,
    auto_commit: bool = True,
) -> dict:
    """
    Merchant-wide on-demand sync: PENDIENTE + due_date < today → VENCIDA,
    affected open credits → MOROSO. Safe to call in background after UI load.
    """
    today = today or date.today()

    overdue_installments = (
        db.query(CreditInstallment)
        .join(Credit, Credit.id == CreditInstallment.credit_id)
        .join(Customer, Customer.id == Credit.customer_id)
        .filter(
            Customer.merchant_id == merchant_id,
            CreditInstallment.status == InstallmentStatus.PENDIENTE,
            CreditInstallment.due_date.isnot(None),
            CreditInstallment.due_date < today,
            Credit.status.notin_([CreditStatus.PAGADO, CreditStatus.CANCELADO]),
        )
        .all()
    )

    affected_credit_ids: set[int] = set()
    for inst in overdue_installments:
        inst.status = InstallmentStatus.VENCIDA
        affected_credit_ids.add(inst.credit_id)

    if affected_credit_ids:
        credits = (
            db.query(Credit)
            .filter(
                Credit.id.in_(affected_credit_ids),
                Credit.status.notin_([CreditStatus.PAGADO, CreditStatus.CANCELADO]),
            )
            .all()
        )
        for credit in credits:
            if Decimal(str(credit.balance)) <= Decimal("0.10"):
                continue
            credit.status = CreditStatus.MOROSO

    if auto_commit:
        db.commit()
    else:
        db.flush()

    return {
        "processed_installments": len(overdue_installments),
        "affected_credits": len(affected_credit_ids),
        "status": "ok",
        "reference_date": today.isoformat(),
    }
