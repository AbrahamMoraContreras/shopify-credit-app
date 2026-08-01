"""Evaluation script for morosity coexistence (no full DB schema / JSONB)."""
from __future__ import annotations

import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

SRC = Path(__file__).resolve().parents[1] / "src"
sys.path.insert(0, str(SRC))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles

@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "TEXT"

from db.base import Base
from models.merchant import Merchant
from models.customer import Customer
from models.credit import Credit
from models.installment import CreditInstallment
from models.payment import Payment
from models.enums import CreditStatus, InstallmentStatus
from services.morosity import (
    apply_morosity_from_payment_date,
    refresh_credit_morosity,
    sync_calendar_morosity,
)


def setup_db():
    engine = create_engine("sqlite:///:memory:")
    tables = [
        Merchant.__table__,
        Customer.__table__,
        Credit.__table__,
        CreditInstallment.__table__,
        Payment.__table__,
    ]
    Base.metadata.create_all(bind=engine, tables=tables)
    return sessionmaker(bind=engine)()


def seed(db, *, due_offset_days: int, status=InstallmentStatus.PENDIENTE, credit_status=CreditStatus.EMITIDO):
    merchant = Merchant(id=uuid4(), shop_domain=f"shop-{uuid4().hex[:8]}.myshopify.com")
    db.add(merchant)
    db.flush()
    customer = Customer(
        merchant_id=merchant.id,
        full_name="Cliente Test",
        email="t@test.com",
        favorable_balance=Decimal("0"),
    )
    db.add(customer)
    db.flush()
    credit = Credit(
        customer_id=customer.id,
        concept="Pedido",
        total_amount=Decimal("100.00"),
        balance=Decimal("100.00"),
        installments_count=1,
        status=credit_status,
    )
    db.add(credit)
    db.flush()
    inst = CreditInstallment(
        credit_id=credit.id,
        number=1,
        amount=Decimal("100.00"),
        due_date=date.today() + timedelta(days=due_offset_days),
        status=status,
        paid_amount=Decimal("0"),
    )
    db.add(inst)
    db.commit()
    db.refresh(credit)
    db.refresh(inst)
    return merchant, credit, inst


def assert_eq(label, got, expected):
    if got != expected:
        raise AssertionError(f"{label}: got {got!r}, expected {expected!r}")
    print(f"  OK  {label}")


def main():
    print("=== Morosity evaluation ===")

    db = setup_db()
    merchant, credit, inst = seed(db, due_offset_days=-5)
    result = sync_calendar_morosity(db, merchant.id, today=date.today())
    db.refresh(inst)
    db.refresh(credit)
    assert_eq("sync processed", result["processed_installments"], 1)
    assert_eq("sync status cuota", inst.status, InstallmentStatus.VENCIDA)
    assert_eq("sync credit MOROSO", credit.status, CreditStatus.MOROSO)
    db.close()

    db = setup_db()
    merchant, credit, inst = seed(db, due_offset_days=10)
    result = sync_calendar_morosity(db, merchant.id)
    db.refresh(inst)
    db.refresh(credit)
    assert_eq("future processed", result["processed_installments"], 0)
    assert_eq("future cuota", inst.status, InstallmentStatus.PENDIENTE)
    assert_eq("future credit", credit.status, CreditStatus.EMITIDO)
    db.close()

    db = setup_db()
    merchant, credit, inst = seed(db, due_offset_days=-3, credit_status=CreditStatus.PAGADO)
    result = sync_calendar_morosity(db, merchant.id)
    assert_eq("pagado skipped", result["processed_installments"], 0)
    db.close()

    db = setup_db()
    merchant, credit, inst = seed(db, due_offset_days=-2)
    inst.status = InstallmentStatus.VENCIDA
    credit.status = CreditStatus.MOROSO
    db.commit()
    early = date.today() - timedelta(days=30)
    apply_morosity_from_payment_date(db, credit, early, today=date.today())
    db.flush()
    db.refresh(inst)
    db.refresh(credit)
    assert_eq("preserve calendar VENCIDA", inst.status, InstallmentStatus.VENCIDA)
    assert_eq("preserve MOROSO", credit.status, CreditStatus.MOROSO)
    db.close()

    db = setup_db()
    merchant, credit, inst = seed(db, due_offset_days=-1)
    refresh_credit_morosity(db, credit)
    db.flush()
    db.refresh(inst)
    db.refresh(credit)
    assert_eq("refresh calendar cuota", inst.status, InstallmentStatus.VENCIDA)
    assert_eq("refresh calendar credit", credit.status, CreditStatus.MOROSO)
    db.close()

    db = setup_db()
    merchant, credit, inst = seed(db, due_offset_days=-7)
    sync_calendar_morosity(db, merchant.id)
    result2 = sync_calendar_morosity(db, merchant.id)
    assert_eq("idempotent second pass", result2["processed_installments"], 0)
    db.refresh(inst)
    assert_eq("still VENCIDA", inst.status, InstallmentStatus.VENCIDA)
    db.close()

    db = setup_db()
    merchant, credit, inst = seed(db, due_offset_days=5)
    apply_morosity_from_payment_date(
        db, credit, date.today() + timedelta(days=10), today=date.today()
    )
    db.flush()
    db.refresh(inst)
    assert_eq("late payment marks VENCIDA", inst.status, InstallmentStatus.VENCIDA)
    db.close()

    print("=== All morosity checks passed ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
