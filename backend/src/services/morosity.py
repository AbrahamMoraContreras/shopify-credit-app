from sqlalchemy.orm import Session
from datetime import date
from models.credit import Credit
from models.installment import CreditInstallment
from models.enums import InstallmentStatus, CreditStatus

def process_morosity(db: Session) -> int:
    today = date.today()

    # 1️⃣ Cuotas vencidas → MOROSO
    overdue_installments = (
        db.query(CreditInstallment)
        .filter(
            CreditInstallment.due_date < today,
            CreditInstallment.status != InstallmentStatus.PAGADA
        )
        .all()
    )

    affected_credits = set()

    for installment in overdue_installments:
        installment.status = InstallmentStatus.VENCIDO
        affected_credits.add(installment.credit_id)

    # 2️⃣ Créditos → MOROSO
    if affected_credits:
        db.query(Credit)\
            .filter(Credit.id.in_(affected_credits))\
            .update(
                {Credit.status: CreditStatus.MOROSO},
                synchronize_session=False
            )

    db.commit()
    return len(overdue_installments)
