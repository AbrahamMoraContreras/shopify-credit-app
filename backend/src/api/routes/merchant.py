# app/api/routes/merchant.py
from fastapi import APIRouter, Depends, status, HTTPException, Header, Request
from pydantic import BaseModel
from typing import Optional, Any
from sqlalchemy.orm import Session
from uuid import UUID

from core.dependencies import get_db, get_merchant_id
from crud.merchant import get_or_create_merchant
from models.merchant import Merchant
from core.security import create_access_token, create_refresh_token, verify_token
from fastapi.responses import JSONResponse
from fastapi import Request


router = APIRouter(prefix="/merchants", tags=["Merchants"])


class MerchantRegisterRequest(BaseModel):
    shop_domain: str


class MerchantRegisterResponse(BaseModel):
    id: str
    shop_domain: str
    access_token: str

    model_config = {"from_attributes": True}


@router.post(
    "/register",
    response_model=MerchantRegisterResponse,
    status_code=status.HTTP_200_OK,
)
def register_merchant(
    payload: MerchantRegisterRequest,
    request: Request,
    x_internal_secret: str = Header(None),
    db: Session = Depends(get_db),
):
    from core.config import settings
    print(f"DEBUG: ALL HEADERS = {request.headers}")
    print(f"DEBUG: received x_internal_secret = {x_internal_secret}")
    print(f"DEBUG: expected settings.INTERNAL_AUTH_SECRET = {settings.INTERNAL_AUTH_SECRET}")
    if x_internal_secret != settings.INTERNAL_AUTH_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal secret - request must originate from trusted server."
        )

    """
    Auto-register a Shopify store as a merchant.
    Called by the frontend on every app load.
    Returns the existing merchant if already registered along with JWT tokens.
    """
    merchant = get_or_create_merchant(db, payload.shop_domain)
    
    access_token = create_access_token(merchant.id)
    refresh_token = create_refresh_token(merchant.id)
    
    response = JSONResponse(
        content={
            "id": str(merchant.id),
            "shop_domain": merchant.shop_domain,
            "access_token": access_token
        }
    )
    
    # Set HttpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=7 * 24 * 60 * 60, # 7 days
        samesite="lax",
        secure=False, # Set to True in production (HTTPS)
    )
    
    return response

class RefreshTokenResponse(BaseModel):
    access_token: str

@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_access_token(request: Request):
    """
    Endpoint to refresh the access token using the HttpOnly refresh token cookie.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
        
    merchant_id_str = verify_token(refresh_token, is_refresh=True)
    if not merchant_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
        
    new_access_token = create_access_token(merchant_id_str)
    return {"access_token": new_access_token}


class PaymentMethodSettings(BaseModel):
    banco: Optional[str] = None
    telefono: Optional[str] = None
    numero: Optional[str] = None
    tipoCi: Optional[str] = None
    ci: Optional[str] = None


class MerchantSettingsPayload(BaseModel):
    pago_movil: Optional[PaymentMethodSettings] = None
    transferencia: Optional[PaymentMethodSettings] = None


class MerchantSettingsResponse(BaseModel):
    pago_movil: Optional[Any] = None
    transferencia: Optional[Any] = None


@router.get("/settings", response_model=MerchantSettingsResponse)
def get_merchant_settings(
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    return MerchantSettingsResponse(
        pago_movil=merchant.pago_movil_settings,
        transferencia=merchant.transferencia_settings,
    )


@router.put("/settings", response_model=MerchantSettingsResponse)
def update_merchant_settings(
    payload: MerchantSettingsPayload,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    if payload.pago_movil is not None:
        merchant.pago_movil_settings = payload.pago_movil.model_dump()
    if payload.transferencia is not None:
        merchant.transferencia_settings = payload.transferencia.model_dump()
    db.commit()
    db.refresh(merchant)
    return MerchantSettingsResponse(
        pago_movil=merchant.pago_movil_settings,
        transferencia=merchant.transferencia_settings,
    )
