"""Evaluation script for morosity coexistence (no full DB schema / JSONB).

Incluye casos de 1 cuota y escenarios multi-cuota (3–4) con pagos
a tiempo, tardíos y mora calendario.
"""
from __future__ import annotations

import sys
from datetime import date, datetime, timedelta
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
from models.enums import CreditStatus, InstallmentStatus, PaymentStatus
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


def seed_quincenal(
    db,
    *,
    due_offsets: list[int],
    today: date | None = None,
    credit_status: CreditStatus = CreditStatus.EN_PROGRESO,
):
    """Crédito multi-cuota; due_offsets son días relativos a `today`."""
    today = today or date.today()
    n = len(due_offsets)
    amount = (Decimal("100.00") / n).quantize(Decimal("0.01"))
    total = amount * n

    merchant = Merchant(id=uuid4(), shop_domain=f"shop-{uuid4().hex[:8]}.myshopify.com")
    db.add(merchant)
    db.flush()
    customer = Customer(
        merchant_id=merchant.id,
        full_name="Cliente Multi",
        email="multi@test.com",
        favorable_balance=Decimal("0"),
    )
    db.add(customer)
    db.flush()
    credit = Credit(
        customer_id=customer.id,
        concept="Quincenal multi",
        total_amount=total,
        balance=total,
        installments_count=n,
        status=credit_status,
    )
    db.add(credit)
    db.flush()

    installments: list[CreditInstallment] = []
    for i, offset in enumerate(due_offsets, start=1):
        inst = CreditInstallment(
            credit_id=credit.id,
            number=i,
            amount=amount if i < n else (total - amount * (n - 1)),
            due_date=today + timedelta(days=offset),
            status=InstallmentStatus.PENDIENTE,
            paid_amount=Decimal("0"),
        )
        db.add(inst)
        installments.append(inst)

    db.commit()
    db.refresh(credit)
    for inst in installments:
        db.refresh(inst)
    return merchant, credit, installments


def mark_paid(db, credit: Credit, inst: CreditInstallment, *, payment_date: date) -> Payment:
    """Marca cuota PAGADA, baja balance y registra pago APROBADO (para refresh)."""
    remaining = Decimal(str(inst.amount)) - Decimal(str(inst.paid_amount))
    inst.paid_amount = inst.amount
    inst.status = InstallmentStatus.PAGADA
    inst.paid_at = datetime.combine(payment_date, datetime.min.time())
    credit.balance = Decimal(str(credit.balance)) - remaining

    payment = Payment(
        credit_id=credit.id,
        amount=remaining,
        reference_number=f"TEST-{uuid4().hex[:10]}",
        payment_method="CASH",
        status=PaymentStatus.APROBADO,
        payment_date=datetime.combine(payment_date, datetime.min.time()),
        reviewed_at=datetime.utcnow(),
        punctuality_value=Decimal("100") if payment_date <= inst.due_date else Decimal("0"),
    )
    db.add(payment)
    db.flush()
    return payment


def reload_installments(db, credit_id: int) -> list[CreditInstallment]:
    return (
        db.query(CreditInstallment)
        .filter(CreditInstallment.credit_id == credit_id)
        .order_by(CreditInstallment.number.asc())
        .all()
    )


def assert_eq(label, got, expected):
    if got != expected:
        raise AssertionError(f"{label}: got {got!r}, expected {expected!r}")
    print(f"  OK  {label}")


def run_single_installment_suite():
    print("=== Morosity evaluation (1 cuota) ===")

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
    assert_eq("future payment_date keeps future cuota PENDIENTE", inst.status, InstallmentStatus.PENDIENTE)
    db.close()


def run_multi_installment_suite():
    print("=== Morosity evaluation (multi-cuota) ===")
    today = date.today()

    # ------------------------------------------------------------------
    # A) 4 cuotas quincenales: pagar #1 a tiempo y #2 tarde con payment_date
    #    posterior al due de #3/#4 → #3 y #4 deben seguir PENDIENTE (cap hoy).
    #    Offsets: -20, -5, +10, +25  (dos vencidas/pasadas, dos futuras)
    #    Tras pagar -20 y -5, solo quedan futuras → crédito EN_PROGRESO.
    # ------------------------------------------------------------------
    print("-- A: a tiempo + tardío sin contaminar cuotas futuras --")
    db = setup_db()
    merchant, credit, insts = seed_quincenal(db, due_offsets=[-20, -5, 10, 25], today=today)
    i1, i2, i3, i4 = insts

    # Pago #1 a tiempo (mismo día del vencimiento)
    mark_paid(db, credit, i1, payment_date=i1.due_date)
    apply_morosity_from_payment_date(db, credit, i1.due_date, today=today)
    db.commit()
    insts = reload_installments(db, credit.id)
    i1, i2, i3, i4 = insts
    assert_eq("A cuota1 PAGADA a tiempo", i1.status, InstallmentStatus.PAGADA)
    assert_eq("A cuota2 aún abierta (pasada)", i2.status, InstallmentStatus.VENCIDA)
    assert_eq("A cuota3 futura PENDIENTE", i3.status, InstallmentStatus.PENDIENTE)
    assert_eq("A cuota4 futura PENDIENTE", i4.status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("A crédito MOROSO tras cuota2 vencida", credit.status, CreditStatus.MOROSO)

    # Pago #2 tarde: payment_date después de due de #3 y #4, pero cap a today
    late_pay = today + timedelta(days=40)  # ficticia futura
    mark_paid(db, credit, i2, payment_date=i2.due_date + timedelta(days=3))
    apply_morosity_from_payment_date(db, credit, late_pay, today=today)
    db.commit()
    insts = reload_installments(db, credit.id)
    i1, i2, i3, i4 = insts
    assert_eq("A cuota2 PAGADA tardía", i2.status, InstallmentStatus.PAGADA)
    assert_eq("A cuota3 NO marcada VENCIDA por payment_date futura", i3.status, InstallmentStatus.PENDIENTE)
    assert_eq("A cuota4 NO marcada VENCIDA por payment_date futura", i4.status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("A crédito EN_PROGRESO (solo futuras abiertas)", credit.status, CreditStatus.EN_PROGRESO)
    db.close()

    # ------------------------------------------------------------------
    # B) 4 cuotas: #1 y #2 ya vencidas sin pagar → sync calendario;
    #    pagar solo #1 tarde → #2 sigue VENCIDA, #3/#4 PENDIENTE, crédito MOROSO.
    # ------------------------------------------------------------------
    print("-- B: mora calendario + pago parcial tardío --")
    db = setup_db()
    merchant, credit, insts = seed_quincenal(db, due_offsets=[-30, -15, 5, 20], today=today)
    sync_calendar_morosity(db, merchant.id, today=today)
    insts = reload_installments(db, credit.id)
    assert_eq("B sync i1 VENCIDA", insts[0].status, InstallmentStatus.VENCIDA)
    assert_eq("B sync i2 VENCIDA", insts[1].status, InstallmentStatus.VENCIDA)
    assert_eq("B sync i3 PENDIENTE", insts[2].status, InstallmentStatus.PENDIENTE)
    assert_eq("B sync i4 PENDIENTE", insts[3].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("B sync crédito MOROSO", credit.status, CreditStatus.MOROSO)

    mark_paid(db, credit, insts[0], payment_date=today)  # paga #1 hoy (tardío vs due -30)
    apply_morosity_from_payment_date(db, credit, today, today=today)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("B i1 PAGADA", insts[0].status, InstallmentStatus.PAGADA)
    assert_eq("B i2 sigue VENCIDA", insts[1].status, InstallmentStatus.VENCIDA)
    assert_eq("B i3 PENDIENTE", insts[2].status, InstallmentStatus.PENDIENTE)
    assert_eq("B i4 PENDIENTE", insts[3].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("B crédito sigue MOROSO", credit.status, CreditStatus.MOROSO)
    db.close()

    # ------------------------------------------------------------------
    # C) 3 cuotas todas futuras: pago #1 con payment_date > due de #2 y #3
    #    → solo #1 PAGADA; #2/#3 PENDIENTE (regresión del bug registre_payment).
    # ------------------------------------------------------------------
    print("-- C: pago tardío ficticio no vence cuotas futuras (3 cuotas) --")
    db = setup_db()
    merchant, credit, insts = seed_quincenal(db, due_offsets=[5, 20, 35], today=today)
    i1, i2, i3 = insts
    # "Tardío" respecto a due de i1 pero con fecha de registro muy futura
    mark_paid(db, credit, i1, payment_date=i1.due_date + timedelta(days=2))
    apply_morosity_from_payment_date(
        db, credit, i3.due_date + timedelta(days=1), today=today
    )
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("C i1 PAGADA", insts[0].status, InstallmentStatus.PAGADA)
    assert_eq("C i2 PENDIENTE", insts[1].status, InstallmentStatus.PENDIENTE)
    assert_eq("C i3 PENDIENTE", insts[2].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("C crédito EN_PROGRESO", credit.status, CreditStatus.EN_PROGRESO)
    db.close()

    # ------------------------------------------------------------------
    # D) Línea de tiempo: 4 cuotas con offsets fijos; pagos en distintos
    #    "días de operación" avanzando `today` simulado.
    #    t0: due [-45,-30,-15,0] relativo a today_final
    #    Simulamos today_op moviéndose.
    # ------------------------------------------------------------------
    print("-- D: línea de tiempo multi-pago (a tiempo, tarde, mora residual) --")
    db = setup_db()
    # Ancla: today_final = hoy. Cuotas vencen hace 45, 30, 15 días y hoy.
    merchant, credit, insts = seed_quincenal(
        db, due_offsets=[-45, -30, -15, 0], today=today, credit_status=CreditStatus.EN_PROGRESO
    )

    # Día -40 (5 días después del due de #1): paga #1 a tiempo-ish (due-45, pay at -40 = tarde 5d)
    # Usamos apply con today=-40 para no marcar #2/#3/#4 si aún no vencen ese día.
    day_a = today - timedelta(days=40)
    mark_paid(db, credit, insts[0], payment_date=day_a)
    apply_morosity_from_payment_date(db, credit, day_a, today=day_a)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("D1 i1 PAGADA", insts[0].status, InstallmentStatus.PAGADA)
    assert_eq("D1 i2 PENDIENTE (aún no vence en day_a)", insts[1].status, InstallmentStatus.PENDIENTE)
    assert_eq("D1 i3 PENDIENTE", insts[2].status, InstallmentStatus.PENDIENTE)
    assert_eq("D1 i4 PENDIENTE", insts[3].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("D1 crédito EN_PROGRESO", credit.status, CreditStatus.EN_PROGRESO)

    # Día -20: #2 ya venció (-30); sync/mora → #2 VENCIDA; paga #2 tarde
    day_b = today - timedelta(days=20)
    apply_morosity_from_payment_date(db, credit, day_b, today=day_b)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("D2 i2 VENCIDA antes de pagar", insts[1].status, InstallmentStatus.VENCIDA)
    assert_eq("D2 i3 PENDIENTE (vence en -15, day_b=-20)", insts[2].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("D2 crédito MOROSO", credit.status, CreditStatus.MOROSO)

    mark_paid(db, credit, insts[1], payment_date=day_b)
    apply_morosity_from_payment_date(db, credit, day_b, today=day_b)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("D2 i2 PAGADA tardía", insts[1].status, InstallmentStatus.PAGADA)
    assert_eq("D2 i3 sigue PENDIENTE", insts[2].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("D2 tras pagar #2 -> EN_PROGRESO", credit.status, CreditStatus.EN_PROGRESO)

    # Día today: #3 vencida (-15), #4 vence hoy (due < today es estricto, hoy no vence)
    apply_morosity_from_payment_date(db, credit, today, today=today)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("D3 i3 VENCIDA", insts[2].status, InstallmentStatus.VENCIDA)
    assert_eq("D3 i4 PENDIENTE (vence hoy, due < today falso)", insts[3].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("D3 crédito MOROSO", credit.status, CreditStatus.MOROSO)

    # Paga #3 tarde hoy; #4 sigue pendiente del día
    mark_paid(db, credit, insts[2], payment_date=today)
    apply_morosity_from_payment_date(db, credit, today, today=today)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("D3 i3 PAGADA", insts[2].status, InstallmentStatus.PAGADA)
    assert_eq("D3 i4 PENDIENTE", insts[3].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("D3 tras pagar #3 -> EN_PROGRESO", credit.status, CreditStatus.EN_PROGRESO)
    db.close()

    # ------------------------------------------------------------------
    # E) refresh_credit_morosity usa último pago APROBADO: 3 cuotas,
    #    #1 pagada a tiempo, #2 vencida sin pagar, #3 futura.
    # ------------------------------------------------------------------
    print("-- E: refresh por último payment_date aprobado --")
    db = setup_db()
    merchant, credit, insts = seed_quincenal(db, due_offsets=[-20, -5, 12], today=today)
    mark_paid(db, credit, insts[0], payment_date=insts[0].due_date)  # a tiempo
    db.commit()
    # Sin aplicar mora aún; refresh lee último APROBADO (payment_date = due #1)
    # due #1 = today-20; effective_ref = that date → #2 (today-5) no es < today-20
    # pero overdue_vs_today: #2 due < today → VENCIDA; #3 futura PENDIENTE
    refresh_credit_morosity(db, credit)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("E i1 PAGADA", insts[0].status, InstallmentStatus.PAGADA)
    assert_eq("E i2 VENCIDA vs today", insts[1].status, InstallmentStatus.VENCIDA)
    assert_eq("E i3 PENDIENTE", insts[2].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("E crédito MOROSO", credit.status, CreditStatus.MOROSO)

    # Paga #2 tarde; nuevo último pago; refresh → sin vencidas abiertas
    mark_paid(db, credit, insts[1], payment_date=today)
    refresh_credit_morosity(db, credit)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("E i2 PAGADA", insts[1].status, InstallmentStatus.PAGADA)
    assert_eq("E i3 PENDIENTE post-pago", insts[2].status, InstallmentStatus.PENDIENTE)
    db.refresh(credit)
    assert_eq("E crédito EN_PROGRESO", credit.status, CreditStatus.EN_PROGRESO)
    db.close()

    # ------------------------------------------------------------------
    # F) Mix de puntualidad en pagos: 3 cuotas pagadas (todas),
    #    #1 a tiempo, #2 tarde, #3 a tiempo; crédito PAGADO por balance.
    # ------------------------------------------------------------------
    print("-- F: tres pagos con puntualidad mixta y cierre de crédito --")
    db = setup_db()
    merchant, credit, insts = seed_quincenal(db, due_offsets=[-40, -25, -10], today=today)
    p1 = mark_paid(db, credit, insts[0], payment_date=insts[0].due_date)  # a tiempo
    p2 = mark_paid(db, credit, insts[1], payment_date=insts[1].due_date + timedelta(days=4))  # tarde
    p3 = mark_paid(db, credit, insts[2], payment_date=insts[2].due_date)  # a tiempo
    apply_morosity_from_payment_date(db, credit, today, today=today)
    db.commit()
    insts = reload_installments(db, credit.id)
    assert_eq("F i1 PAGADA", insts[0].status, InstallmentStatus.PAGADA)
    assert_eq("F i2 PAGADA", insts[1].status, InstallmentStatus.PAGADA)
    assert_eq("F i3 PAGADA", insts[2].status, InstallmentStatus.PAGADA)
    assert_eq("F puntualidad p1 a tiempo", p1.punctuality_value, Decimal("100"))
    assert_eq("F puntualidad p2 tardío", p2.punctuality_value, Decimal("0"))
    assert_eq("F puntualidad p3 a tiempo", p3.punctuality_value, Decimal("100"))
    db.refresh(credit)
    # balance ~0 → apply_morosity corta a PAGADO
    assert_eq("F crédito PAGADO", credit.status, CreditStatus.PAGADO)
    assert_eq("F balance ~0", credit.balance <= Decimal("0.10"), True)
    db.close()


def main():
    run_single_installment_suite()
    run_multi_installment_suite()
    print("=== All morosity checks passed ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
