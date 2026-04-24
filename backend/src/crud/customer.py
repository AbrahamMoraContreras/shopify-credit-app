# backend/app/crud/customer.py
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Tuple

from models.customer import Customer as CustomerModel
from schemas.customer import CustomerCreate, CustomerUpdate

def get_customer(db: Session, customer_id: int) -> Optional[CustomerModel]:
    return db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()

def get_customer_by_shopify_id(db: Session, shopify_customer_id: int, merchant_id: str) -> Optional[CustomerModel]:
    return db.query(CustomerModel).filter(
        CustomerModel.shopify_customer_id == shopify_customer_id,
        CustomerModel.merchant_id == merchant_id
    ).first()

def get_customer_by_email(db: Session, email: str) -> Optional[CustomerModel]:
    return db.query(CustomerModel).filter(CustomerModel.email.ilike(email)).first()

def create_customer(db: Session, payload: CustomerCreate) -> CustomerModel:
    q = db.query(CustomerModel)
    if payload.email:
        exists = q.filter(CustomerModel.email == payload.email).first()
        if exists:
            raise ValueError("Email already registered for another customer.")

    db_obj = CustomerModel(
        merchant_id=payload.merchant_id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        shopify_customer_id=payload.shopify_customer_id
    )

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_customer(db: Session, db_obj: CustomerModel, updates: CustomerUpdate) -> CustomerModel:
    if updates.email and updates.email != db_obj.email:
        exists = db.query(CustomerModel).filter(CustomerModel.email == updates.email, CustomerModel.id != db_obj.id).first()
        if exists:
            raise ValueError("Email already used by another customer.")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_customer(db: Session, db_obj: CustomerModel) -> None:
    db.delete(db_obj)
    db.commit()

def list_customers(db, merchant_id, skip=0, limit=50, search=None, shopify_customer_id=None):
    q = db.query(CustomerModel).filter(CustomerModel.merchant_id == merchant_id)
    if shopify_customer_id is not None:
        q = q.filter(CustomerModel.shopify_customer_id == shopify_customer_id)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            CustomerModel.full_name.ilike(term),
            CustomerModel.email.ilike(term)
        ))
    total = q.count()
    items = q.order_by(CustomerModel.id.desc()).offset(skip).limit(limit).all()
    return items, total
