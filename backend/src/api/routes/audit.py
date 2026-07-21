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
    ).order_by(AuditLog.timestamp.desc()).limit(100).all()
    
    return logs

@router.get("/notifications", summary="Obtener notificaciones recientes del comerciante")
def get_notifications(
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    from models.audit_log import AuditLog
    notifications = db.query(AuditLog).filter(
        AuditLog.merchant_id == merchant_id,
        AuditLog.entity_name == "NOTIFICATION"
    ).order_by(AuditLog.timestamp.desc()).limit(20).all()
    
    return notifications

@router.post("/notifications/{notification_id}/read", summary="Marcar notificación como leída")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    from models.audit_log import AuditLog
    notification = db.query(AuditLog).filter(
        AuditLog.id == notification_id,
        AuditLog.merchant_id == merchant_id,
        AuditLog.entity_name == "NOTIFICATION"
    ).first()
    if not notification:
        return {"error": "Notificación no encontrada"}
    
    # Update changes dict to set is_read=True
    current_changes = dict(notification.changes or {})
    current_changes["is_read"] = True
    notification.changes = current_changes
    db.commit()
    return {"ok": True}

@router.post("/notifications/read-all", summary="Marcar todas las notificaciones como leídas")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    merchant_id: UUID = Depends(get_merchant_id),
):
    from models.audit_log import AuditLog
    notifications = db.query(AuditLog).filter(
        AuditLog.merchant_id == merchant_id,
        AuditLog.entity_name == "NOTIFICATION"
    ).all()
    for n in notifications:
        current_changes = dict(n.changes or {})
        if not current_changes.get("is_read"):
            current_changes["is_read"] = True
            n.changes = current_changes
    db.commit()
    return {"ok": True}
