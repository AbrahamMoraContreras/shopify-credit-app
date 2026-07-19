import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decimal import Decimal
import uuid
import datetime

# Add the src directory to the python path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend", "src"))

from models.credit import Credit
from models.customer import Customer
from models.payment import Payment
from models.installment import CreditInstallment
from models.enums import CreditStatus, PaymentStatus, InstallmentStatus
from crud.payment import create_payment, review_payment
from schemas.payment import PaymentCreate, PaymentMethod

# Setup DB connection
engine = create_engine("postgresql://postgres.rkctqxawphnmtbhjggli:Abraham2001%2A%2A..%3A@aws-1-us-west-2.pooler.supabase.com:5432/postgres")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_simulation():
    db = SessionLocal()
    try:
        from models.merchant import Merchant
        merchant = db.query(Merchant).first()
        if not merchant:
            print("No merchant found!")
            return
        merchant_id = merchant.id
        
        # Create a dummy customer
        customer = Customer(
            full_name="Test Partial Payment Customer",
            merchant_id=merchant_id,
            favorable_balance=Decimal("0.00")
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
        # Create a credit of $600 with 1 installment
        credit = Credit(
            customer_id=customer.id,
            concept="Test Credit",
            total_amount=Decimal("600.00"),
            balance=Decimal("600.00"),
            status=CreditStatus.EN_PROGRESO,
            installments_count=1
        )
        db.add(credit)
        db.commit()
        db.refresh(credit)
        
        inst = CreditInstallment(
            credit_id=credit.id,
            amount=Decimal("600.00"),
            due_date=datetime.date.today(),
            number=1,
            status=InstallmentStatus.PENDIENTE,
            paid_amount=Decimal("0.00")
        )
        db.add(inst)
        db.commit()
        db.refresh(inst)
        
        print(f"Initial - Credit Balance: {credit.balance}, Inst Paid: {inst.paid_amount}")
        
        # Make Payment 1: $500
        p1_data = PaymentCreate(
            credit_id=credit.id,
            amount=500.0,
            payment_method=PaymentMethod.CASH,
            reference_number=f"REF-{uuid.uuid4()}"[:20],
            payment_date=datetime.datetime.utcnow(),
            apply_to_installments=[inst.id]
        )
        p1 = create_payment(db, p1_data, merchant_id)
        # It's created in EN_REVISION, let's approve it
        p1 = review_payment(db, p1.id, PaymentStatus.APROBADO, merchant_id)
        
        db.refresh(credit)
        db.refresh(inst)
        print(f"After P1 ($500) - Credit Balance: {credit.balance}, Inst Paid: {inst.paid_amount}")
        assert credit.balance == Decimal("100.00")
        assert inst.paid_amount == Decimal("500.00")
        
        # Make Payment 2: $150 (Total $650 -> $50 goes to favorable balance)
        p2_data = PaymentCreate(
            credit_id=credit.id,
            amount=150.0,
            payment_method=PaymentMethod.CASH,
            reference_number=f"REF-{uuid.uuid4()}"[:20],
            payment_date=datetime.datetime.utcnow(),
            apply_to_installments=[inst.id]
        )
        p2 = create_payment(db, p2_data, merchant_id)
        p2 = review_payment(db, p2.id, PaymentStatus.APROBADO, merchant_id)
        
        db.refresh(credit)
        db.refresh(inst)
        db.refresh(customer)
        print(f"After P2 ($150) - Credit Balance: {credit.balance}, Inst Paid: {inst.paid_amount}, Favorable: {customer.favorable_balance}, Status: {credit.status.value}")
        assert credit.balance == Decimal("0.00")
        assert inst.paid_amount == Decimal("600.00")
        assert customer.favorable_balance == Decimal("50.00")
        
        # Revert P2
        print("Reverting P2 ($150)...")
        review_payment(db, p2.id, PaymentStatus.RECHAZADO, merchant_id)
        
        db.refresh(credit)
        db.refresh(inst)
        db.refresh(customer)
        print(f"After Reverting P2 - Credit Balance: {credit.balance}, Inst Paid: {inst.paid_amount}, Favorable: {customer.favorable_balance}, Status: {credit.status.value}")
        
        assert credit.balance == Decimal("100.00")
        assert inst.paid_amount == Decimal("500.00")
        assert customer.favorable_balance == Decimal("0.00")
        
        print("Simulation SUCCESS. All assertions passed!")
        
    finally:
        db.close()

if __name__ == "__main__":
    run_simulation()
