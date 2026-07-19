import sys
import os

# Agregamos la ruta del backend al sys.path para poder importar los módulos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend/src')))

from db.session import SessionLocal
from models.credit import Credit
from models.installment import CreditInstallment
from models.enums import CreditStatus, InstallmentStatus
from datetime import datetime

def fix_installments():
    db = SessionLocal()
    try:
        # Buscar créditos que están PAGADO
        completed_credits = db.query(Credit).filter(Credit.status == CreditStatus.PAGADO).all()
        fixed_count = 0
        
        for credit in completed_credits:
            # Buscar cuotas de este crédito que no estén PAGADA
            pending_installments = db.query(CreditInstallment).filter(
                CreditInstallment.credit_id == credit.id,
                CreditInstallment.status != InstallmentStatus.PAGADA
            ).all()
            
            for inst in pending_installments:
                print(f"Fixing installment {inst.id} for credit {credit.id}...")
                inst.status = InstallmentStatus.PAGADA
                inst.paid_amount = inst.amount
                inst.paid_at = datetime.utcnow()
                fixed_count += 1
                
        db.commit()
        print(f"Fixed {fixed_count} installments.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_installments()
