import sys
import os
sys.path.insert(0, os.path.abspath('backend/src'))

from db.session import SessionLocal
from models.payment import Payment
from models.credit import Credit, CreditStatus
from models.installment import CreditInstallment, InstallmentStatus
from models.customer import Customer
from crud.payment import _apply_payment_distribution
from decimal import Decimal
from datetime import datetime

db = SessionLocal()

# Encontrar los pagos que están aprobados pero no tienen cuotas cubiertas en su relación m:n
buggy_payments = db.query(Payment).filter(
    Payment.status == 'APROBADO',
    Payment.installment_id.isnot(None)
).all()

for payment in buggy_payments:
    if not payment.covered_installments:
        print(f"Reparando Pago ID {payment.id}...")
        credit = payment.credit
        customer = credit.customer
        
        inst = db.query(CreditInstallment).filter(CreditInstallment.id == payment.installment_id).first()
        if not inst:
            continue
            
        # 1. Revertir el saldo a favor erróneo
        customer.favorable_balance -= payment.amount
        print(f"Saldo a favor ajustado a: {customer.favorable_balance}")
        
        # 2. Agregar la cuota a covered_installments
        payment.covered_installments.append(inst)
        
        # 3. Aplicar la distribución correctamente
        target_ids = [inst.id]
        
        # Re-aplicar lógica correcta de balances
        payment_amount = Decimal(str(payment.amount))
        
        amount_to_apply_to_credit = payment_amount
        credit.balance -= amount_to_apply_to_credit
        print(f"Credit balance ajustado a: {credit.balance}")
        
        inst.paid_amount = payment_amount
        inst.status = InstallmentStatus.PAGADA
        inst.paid_at = datetime.utcnow()
        print(f"Cuota {inst.id} marcada como PAGADA")
        
        if credit.balance <= Decimal("0.10"):
            credit.balance = Decimal("0.00")
            credit.status = CreditStatus.PAGADO
        else:
            credit.status = CreditStatus.EN_PROGRESO
            
        db.commit()
        print("Pago reparado correctamente.")

db.close()
