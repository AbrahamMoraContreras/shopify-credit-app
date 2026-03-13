# app/api/routes/merchant.py
from fastapi import APIRouter, Depends, status, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from sqlalchemy.orm import Session
from uuid import UUID

from core.dependencies import get_db, get_merchant_id
from crud.merchant import get_or_create_merchant
from models.merchant import Merchant


router = APIRouter(prefix="/merchants", tags=["Merchants"])


class MerchantRegisterRequest(BaseModel):
    shop_domain: str


class MerchantRegisterResponse(BaseModel):
    id: str
    shop_domain: str

    model_config = {"from_attributes": True}


@router.post(
    "/register",
    response_model=MerchantRegisterResponse,
    status_code=status.HTTP_200_OK,
)
def register_merchant(
    payload: MerchantRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Auto-register a Shopify store as a merchant.
    Called by the frontend on every app load.
    Returns the existing merchant if already registered.
    """
    merchant = get_or_create_merchant(db, payload.shop_domain)
    return MerchantRegisterResponse(
        id=str(merchant.id),
        shop_domain=merchant.shop_domain,
    )


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
