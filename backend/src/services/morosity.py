"""Morosity relative to a registered payment date (not calendar 'today')."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from models.credit import Credit
from models.enums import CreditStatus, InstallmentStatus, PaymentStatus
from models.installment import CreditInstallment
from models.payment import Payment


def _as_date(value: date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def apply_morosity_from_payment_date(
    db: Session,
    credit: Credit,
    reference_date: date,
) -> None:
    """
    Update unpaid installment statuses using the payment's registered date.

    - due_date < payment_date  → VENCIDA
    - due_date >= payment_date → PENDIENTE (if not PAGADA / CANCELADA / NO_PAGADA)
    - credit with any VENCIDA  → MOROSO (unless fully paid / cancelled)
    """
    if credit.status == CreditStatus.CANCELADO:
        return

    if Decimal(str(credit.balance)) <= Decimal("0.10"):
        credit.balance = Decimal("0.00")
        credit.status = CreditStatus.PAGADO
        return

    # Fiado without installments: no VENCIDA rows; keep EN_PROGRESO while balance remains.
    if not credit.installments_count:
        credit.status = CreditStatus.EN_PROGRESO
        return

    has_overdue = False
    installments = (
        db.query(CreditInstallment)
        .filter(CreditInstallment.credit_id == credit.id)
        .all()
    )

    for inst in installments:
        status_val = getattr(inst.status, "value", inst.status)
        if status_val in (
            InstallmentStatus.PAGADA.value,
            InstallmentStatus.CANCELADA.value,
            InstallmentStatus.NO_PAGADA.value,
        ):
            continue

        if inst.due_date and inst.due_date < reference_date:
            inst.status = InstallmentStatus.VENCIDA
            has_overdue = True
        else:
            inst.status = InstallmentStatus.PENDIENTE

    credit.status = CreditStatus.MOROSO if has_overdue else CreditStatus.EN_PROGRESO


def refresh_credit_morosity(db: Session, credit: Credit) -> None:
    """
    Recompute morosity from the latest approved payment's payment_date.
    If there is no approved payment, clear VENCIDA back to PENDIENTE.
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
        installments = (
            db.query(CreditInstallment)
            .filter(CreditInstallment.credit_id == credit.id)
            .all()
        )
        for inst in installments:
            status_val = getattr(inst.status, "value", inst.status)
            if status_val == InstallmentStatus.VENCIDA.value:
                inst.status = InstallmentStatus.PENDIENTE
        credit.status = CreditStatus.EN_PROGRESO
        return

    apply_morosity_from_payment_date(db, credit, ref)
