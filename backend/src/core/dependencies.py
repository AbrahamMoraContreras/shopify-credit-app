import uuid
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from uuid import UUID
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.session import SessionLocal
from models.merchant import Merchant
from core.security import verify_token

security = HTTPBearer()


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
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UUID:
    token = credentials.credentials
    merchant_id_str = verify_token(token)
    if not merchant_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return UUID(merchant_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid merchant UUID format in token"
        )


# -------------------------------------
# MERCHANT VALIDATION
# -------------------------------------
def get_current_merchant(
    merchant_id: UUID = Depends(get_merchant_id),
    db: Session = Depends(get_db)
):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()

    if not merchant:
        raise HTTPException(
            status_code=404,
            detail="Merchant not found"
        )

    return merchant
