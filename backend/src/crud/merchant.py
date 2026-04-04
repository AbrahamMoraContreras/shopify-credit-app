# app/crud/merchant.py
from sqlalchemy.orm import Session
from models.merchant import Merchant


def get_or_create_merchant(db: Session, shop_domain: str) -> Merchant:
    """
    Find existing merchant by shop_domain, or create a new one.
    This is called on every app load to ensure the merchant exists.
    """
    merchant = db.query(Merchant).filter(
        Merchant.shop_domain == shop_domain
    ).first()

    if merchant:
        return merchant

    # Registrar nuevo merchant
    merchant = Merchant(shop_domain=shop_domain)
    db.add(merchant)
    db.commit()
    db.refresh(merchant)
    return merchant
