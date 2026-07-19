import sys
import os
sys.path.insert(0, os.path.abspath('backend/src'))

from db.session import SessionLocal
from models.payment import Payment
from models.credit import Credit, CreditStatus
from models.installment import CreditInstallment, InstallmentStatus
from models.customer import Customer
from decimal import Decimal

db = SessionLocal()

# Encontrar los pagos que están aprobados pero no tienen cuotas cubiertas en su relación m:n
buggy_payments = db.query(Payment).filter(
    Payment.status == 'APROBADO',
    Payment.installment_id.isnot(None)
).all()

for p in buggy_payments:
    if not p.covered_installments:
        print(f"Pago Buggy Encontrado: Pago ID {p.id}, Credit {p.credit_id}, Installment {p.installment_id}, Monto {p.amount}")
        customer = p.credit.customer
        print(f"Saldo a favor del cliente {customer.id}: {customer.favorable_balance}")
        
        # Encontrar la cuota correspondiente
        inst = db.query(CreditInstallment).filter(CreditInstallment.id == p.installment_id).first()
        if inst:
            print(f"Cuota objetivo: ID {inst.id}, Estado {inst.status}, Monto {inst.amount}, Pagado {inst.paid_amount}")

db.close()
