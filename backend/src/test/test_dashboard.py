# tests/test_dashboard.py

from datetime import date, timedelta
from uuid import uuid4
from db.base import Base
from crud import dashboard as dashboard_crud
from models.credit import Credit
from models.installment import CreditInstallment
from models.payment import Payment
from models.enums import (
    CreditStatus,
    InstallmentStatus,
    PaymentStatus
)

# -------------------------------------------------
# HELPERS
# -------------------------------------------------

def create_credit(db, merchant_id, **kwargs):
    credit = Credit(
        merchant_id=merchant_id,
        customer_id=1,
        customer_name=kwargs.get("customer_name", "Cliente Test"),
        customer_document_id=kwargs.get("customer_document_id", "V-12345678"),
        concept=kwargs.get("concept", "Test"),
        total_amount=kwargs.get("total_amount", 1000),
        balance=kwargs.get("balance", 1000),
        installments_count=kwargs.get("installments_count", 0),
        status=kwargs.get("status", CreditStatus.EN_PROGRESO),
    )

    db.add(credit)
    db.commit()
    db.refresh(credit)
    return credit


def create_installment(db, credit, **kwargs):
    inst = CreditInstallment(
        credit_id=credit.id,
        number=kwargs.get("number", 1),
        amount=kwargs.get("amount", 500),
        due_date=kwargs.get(
            "due_date",
            date.today() - timedelta(days=10)
        ),
        status=kwargs.get("status", InstallmentStatus.PENDIENTE)
    )
    db.add(inst)
    db.commit()
    return inst


def create_payment(db, credit, merchant_id, **kwargs):
    payment = Payment(
        credit_id=credit.id,
        merchant_id=merchant_id,
        amount=kwargs.get("amount", 500),
        status=kwargs.get("status", PaymentStatus.APROBADO),
        payment_date=date.today(),
        reference_number=f"TEST-{uuid4()}",
        reviewed_at=kwargs.get("reviewed_at")
    )
    db.add(payment)
    db.commit()
    return payment


# -------------------------------------------------
# TESTS
# -------------------------------------------------

def test_total_credits(db, merchant_id):
    create_credit(db, merchant_id)
    create_credit(db, merchant_id)

    assert dashboard_crud.total_credits(db, merchant_id) == 2


def test_active_credits(db, merchant_id):
    create_credit(db, merchant_id, status=CreditStatus.EN_PROGRESO)
    create_credit(db, merchant_id, status=CreditStatus.CANCELADO)

    assert dashboard_crud.active_credits(db, merchant_id) == 1


def test_morose_credits(db, merchant_id):
    credit = create_credit(db, merchant_id)
    create_installment(db, credit)

    assert dashboard_crud.morose_credits(db, merchant_id) == 1


def test_total_emitted(db, merchant_id):
    create_credit(db, merchant_id, total_amount=1000)
    create_credit(db, merchant_id, total_amount=500)

    assert dashboard_crud.total_emitted(db, merchant_id) == 1500


def test_total_pending(db, merchant_id):
    create_credit(db, merchant_id, balance=800)
    create_credit(db, merchant_id, balance=200)

    assert dashboard_crud.total_pending(db, merchant_id) == 1000


def test_total_collected(db, merchant_id):
    credit = create_credit(db, merchant_id)
    create_payment(db, credit, merchant_id, amount=300)

    assert dashboard_crud.total_collected(db, merchant_id) == 300


def test_overdue_amount(db, merchant_id):
    credit = create_credit(db, merchant_id)
    create_installment(db, credit, amount=400)

    assert dashboard_crud.overdue_amount(db, merchant_id) == 400


def test_customers_in_mora(db, merchant_id):
    credit = create_credit(db, merchant_id, customer_id=99)
    create_installment(db, credit)

    assert dashboard_crud.customers_in_mora(db, merchant_id) == 1


def test_collection_ratio(db, merchant_id):
    credit = create_credit(db, merchant_id, total_amount=1000)
    create_payment(db, credit, merchant_id, amount=500)

    assert dashboard_crud.collection_ratio(db, merchant_id) == 50.0


def test_morosity_ratio(db, merchant_id):
    credit = create_credit(db, merchant_id)
    create_installment(db, credit)

    assert dashboard_crud.morosity_ratio(db, merchant_id) == 100.0


def test_pending_payments(db, merchant_id):
    credit = create_credit(db, merchant_id)
    create_payment(
        db,
        credit,
        merchant_id,
        status=PaymentStatus.EN_REVISION
    )

    assert dashboard_crud.pending_payments(db, merchant_id) == 1


def test_approved_today(db, merchant_id):
    credit = create_credit(db, merchant_id)
    create_payment(
        db,
        credit,
        merchant_id,
        status=PaymentStatus.APROBADO,
        reviewed_at=date.today()
    )

    assert dashboard_crud.approved_today(db, merchant_id) == 1
