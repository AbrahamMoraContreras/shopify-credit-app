import uuid
from sqlalchemy.orm import Session
from fastapi import Depends, Header, HTTPException, status
from uuid import UUID
from fastapi import Header, HTTPException
from db.session import SessionLocal
from models.merchant import Merchant


# -------------------------------------
# ALWAYS RETURN A DB SESSION
# -------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# def get_merchant_id(x_merchant_id: str = Header(..., alias="X-Merchant-ID")
#) -> UUID:
#    """
#    Lee el header X-Merchant-ID enviado en cada request.
#   Es obligatorio para aislar los datos por comercio.
#    """
#    if not x_merchant_id:
#        raise HTTPException(status_code=400, detail="Missing X-Merchant-ID header")
#    return x_merchant_id

def get_merchant_id(
    x_merchant_id: str = Header(None, alias="X-Merchant-ID")
) -> UUID:
    if not x_merchant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Merchant-ID header"
        )
    try:
        return UUID(x_merchant_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Merchant-ID format"
        )



# -------------------------------------
# MERCHANT VALIDATION
# -------------------------------------
def get_current_merchant(
    x_merchant_id: str = Header(None),
    db: Session = Depends(get_db)
):
    if not x_merchant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Merchant-ID header"
        )

    try:
        merchant_uuid = uuid.UUID(x_merchant_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid merchant UUID format"
        )

    merchant = db.query(Merchant).filter(Merchant.id == merchant_uuid).first()

    if not merchant:
        raise HTTPException(
            status_code=404,
            detail="Merchant not found"
        )

    return merchant
