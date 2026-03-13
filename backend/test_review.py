import os
import sys

# Setting paths 
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.crud.payment import review_payment
from app.models.payment import Payment
from app.models.enums import PaymentStatus
import traceback

def test():
    db = SessionLocal()
    # Let's get the latest EN_REVISION payment
    p = db.query(Payment).filter(Payment.status == PaymentStatus.EN_REVISION).order_by(Payment.id.desc()).first()
    if not p:
        print("No pending payment found")
        return
    
    print(f"Testing payment {p.id} for merchant {p.merchant_id}")
    try:
        review_payment(db, p.id, PaymentStatus.APROBADO, p.merchant_id)
        print("Success! Payment is now APROBADO")
    except Exception as e:
        print(f"Failed with exception: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test()
