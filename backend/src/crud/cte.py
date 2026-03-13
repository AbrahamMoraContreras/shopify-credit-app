# app/crud/ctes.py
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.credit_item import CreditItem

def credit_items_agg_cte(db: Session):
    return (
        db.query(
            CreditItem.credit_id.label("credit_id"),
            func.count(CreditItem.id).label("items_count"),
            func.sum(CreditItem.quantity).label("total_quantity"),
            func.sum(
                CreditItem.quantity * CreditItem.unit_price
            ).label("products_total")
        )
        .group_by(CreditItem.credit_id)
        .cte("credit_items_agg")
    )
