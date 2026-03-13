# app/crud/dashboard.py
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, cast, Date
from uuid import UUID
from datetime import date, datetime, timedelta
from decimal import Decimal

from models.credit import Credit, CreditStatus
from models.installment import CreditInstallment, InstallmentStatus
from models.payment import Payment, PaymentStatus
from models.customer import Customer

def total_credits(db: Session, merchant_id: UUID) -> int:
    return db.query(Credit).filter(Credit.merchant_id == merchant_id).count()

def active_credits(db: Session, merchant_id: UUID) -> int:
    return db.query(Credit).filter(
        Credit.merchant_id == merchant_id,
        Credit.status.in_([CreditStatus.PENDIENTE_ACTIVACION, CreditStatus.EMITIDO, CreditStatus.EN_PROGRESO])
    ).count()

def morose_credits(db: Session, merchant_id: UUID) -> int:
    return db.query(Credit).join(CreditInstallment).filter(
        Credit.merchant_id == merchant_id,
        CreditInstallment.status == InstallmentStatus.VENCIDO
    ).distinct().count()

def total_emitted(db: Session, merchant_id: UUID) -> Decimal:
    res = db.query(func.sum(Credit.total_amount)).filter(Credit.merchant_id == merchant_id).scalar()
    return Decimal(str(res or 0))

def total_pending(db: Session, merchant_id: UUID) -> Decimal:
    res = db.query(func.sum(Credit.balance)).filter(Credit.merchant_id == merchant_id).scalar()
    return Decimal(str(res or 0))

def total_collected(db: Session, merchant_id: UUID) -> Decimal:
    res = db.query(func.sum(Payment.amount)).filter(
        Payment.merchant_id == merchant_id,
        Payment.status == PaymentStatus.APROBADO
    ).scalar()
    return Decimal(str(res or 0))

def overdue_amount(db: Session, merchant_id: UUID) -> Decimal:
    res = db.query(func.sum(CreditInstallment.amount)).filter(
        Credit.merchant_id == merchant_id,
        CreditInstallment.status == InstallmentStatus.VENCIDO
    ).join(Credit).scalar()
    return Decimal(str(res or 0))

def total_customers(db: Session, merchant_id: UUID) -> int:
    return db.query(Customer).filter(Customer.merchant_id == merchant_id).count()

def customers_in_mora(db: Session, merchant_id: UUID) -> int:
    return db.query(Customer).join(Credit).join(CreditInstallment).filter(
        Customer.merchant_id == merchant_id,
        CreditInstallment.status == InstallmentStatus.VENCIDO
    ).distinct().count()

def pending_payments(db: Session, merchant_id: UUID) -> int:
    return db.query(Payment).filter(
        Payment.merchant_id == merchant_id,
        Payment.status == PaymentStatus.EN_REVISION
    ).count()

def approved_today(db: Session, merchant_id: UUID) -> int:
    today = date.today()
    return db.query(Payment).filter(
        Payment.merchant_id == merchant_id,
        Payment.status == PaymentStatus.APROBADO,
        cast(Payment.reviewed_at, Date) == today
    ).count()

def collection_ratio(db: Session, merchant_id: UUID) -> float:
    emitted = float(total_emitted(db, merchant_id))
    if emitted == 0: return 0.0
    collected = float(total_collected(db, merchant_id))
    return round((collected / emitted) * 100, 2)

def morosity_ratio(db: Session, merchant_id: UUID) -> float:
    total = total_credits(db, merchant_id)
    if total == 0: return 0.0
    morose = morose_credits(db, merchant_id)
    return round((morose / total) * 100, 2)

def customers_summary_data(db: Session, merchant_id: UUID):
    # Retrieve all customers for the merchant
    customers = db.query(Customer).filter(Customer.merchant_id == merchant_id).all()
    
    summary = []
    clients_with_debt = 0
    total_customers = len(customers)
    
    for customer in customers:
        # Sum only active credits (unpaid)
        active_credits = [
            c for c in customer.credits 
            if getattr(c.status, "value", c.status) in ["PENDIENTE_ACTIVACION", "EMITIDO", "EN_PROGRESO", "MOROSO"]
        ]
        pending_orders = len(active_credits)
        pending_debt = sum(c.balance for c in active_credits)
        favorable_balance = customer.favorable_balance
        
        # We only list them if they have pending orders OR a favorable balance
        if pending_orders > 0 or favorable_balance > 0:
            if pending_debt > 0:
                clients_with_debt += 1
                
            summary.append({
                "id": customer.id,
                "name": customer.full_name,
                "pendingOrders": pending_orders,
                "pendingDebt": float(pending_debt),
                "balance": float(favorable_balance),
            })
            
    # Sort by debt descending
    summary.sort(key=lambda x: x["pendingDebt"], reverse=True)
    
    return {
        "list": summary,
        "clientsWithDebt": clients_with_debt,
        "totalCustomers": total_customers
    }

def dashboard_snapshot(db: Session, merchant_id: UUID):
    summary_data = customers_summary_data(db, merchant_id)
    
    return {
        "credits": {
            "total": total_credits(db, merchant_id),
            "active": active_credits(db, merchant_id),
            "morose": morose_credits(db, merchant_id),
        },
        "amounts": {
            "total_emitted": total_emitted(db, merchant_id),
            "total_pending": total_pending(db, merchant_id),
            "total_collected": total_collected(db, merchant_id),
            "overdue": overdue_amount(db, merchant_id),
        },
        "customers": {
            "total_customers": summary_data["totalCustomers"],
            "with_morosity": customers_in_mora(db, merchant_id),
            "clients_with_debt": summary_data["clientsWithDebt"],
        },
        "customers_summary": summary_data["list"],
        "risk": {
            "collection_ratio": collection_ratio(db, merchant_id),
            "morosity_ratio": morosity_ratio(db, merchant_id),
            "avg_days_late": 0.0,
        },
        "payments": {
            "pending_review": pending_payments(db, merchant_id),
            "approved_today": approved_today(db, merchant_id),
        },
        "generated_at": date.today()
    }
