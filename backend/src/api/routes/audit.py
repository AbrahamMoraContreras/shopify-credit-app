# app/api/routes/audit.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from core.dependencies import get_db, get_merchant_id
from crud.audit import log_audit_action

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.post("/login", summary="Registrar ingreso de usuario a la app")
def log_login(
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    log_audit_action(
        db=db,
        merchant_id=merchant_id,
        entity_name="USER_SESSION",
        action="LOGIN",
        changes={"message": "El usuario ingresó a la app de Shopify."}
    )
    db.commit()
    return {"ok": True}

@router.get("/customer/{customer_id}/balance-history", summary="Obtener historial de saldo a favor de un cliente")
def get_customer_balance_history(
    customer_id: int,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    from models.audit_log import AuditLog
    logs = db.query(AuditLog).filter(
        AuditLog.merchant_id == merchant_id,
        AuditLog.entity_name == "CUSTOMER_BALANCE",
        AuditLog.entity_id == str(customer_id)
    ).order_by(AuditLog.timestamp.desc()).all()
    
    return logs
