# app/api/routes/public.py
# These endpoints are PUBLIC — no X-Merchant-ID required.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional

from core.dependencies import get_db
from models.payment_token import PaymentToken, PaymentProof
from models.payment import Payment
from models.credit import Credit
from models.customer import Customer
from models.merchant import Merchant

router = APIRouter(prefix="/public", tags=["Public"])


from typing import Optional, List

class ProductInfo(BaseModel):
    nombre: str
    cantidad: int
    precio: Decimal

class QuotaInfo(BaseModel):
    cantidad: int
    valorCuota: Decimal

class DestinoInfo(BaseModel):
    banco: Optional[str] = None
    rif: Optional[str] = None
    telefono: Optional[str] = None
    cuenta: Optional[str] = None

class PaymentInfoResponse(BaseModel):
    numeroOrden: str
    fecha: str
    tienda: str
    productos: List[ProductInfo]
    subtotal: Decimal
    iva: Decimal
    total: Decimal
    cuotas: Optional[QuotaInfo] = None
    metodosAceptados: List[str]
    cuentaDestino: DestinoInfo
    binanceDestino: Optional[dict] = None
    zelleDestino: Optional[dict] = None
    zinliDestino: Optional[dict] = None
    debitoDestino: Optional[dict] = None
    customer_name: str
    customer_email: str
    saldo_a_favor: Decimal = Decimal("0.00")


class ProofSubmission(BaseModel):
    token: str
    reference_number: str
    bank_name: str
    amount: Decimal
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    phone_number: Optional[str] = None
    account_number: Optional[str] = None
    notes: Optional[str] = None


@router.get("/payment-info")
def get_payment_info(token: str, db: Session = Depends(get_db)):
    pt = db.query(PaymentToken).filter(PaymentToken.token == token).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Token inválido o no encontrado.")
    if pt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="El enlace ha expirado.")
    if pt.proof:
        raise HTTPException(status_code=409, detail="Este pago ya fue reportado.")

    payment = db.query(Payment).filter(Payment.id == pt.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")

    credit = db.query(Credit).filter(Credit.id == payment.credit_id).first()
    merchant = db.query(Merchant).filter(Merchant.id == pt.merchant_id).first()

    installment_number = None
    if payment.installment_id and credit:
        inst = next((i for i in credit.installments if i.id == payment.installment_id), None)
        installment_number = inst.number if inst else None

    import locale
    try: locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
    except: pass
    
    productos = []
    subtotal = Decimal("0.00")
    if credit and getattr(credit, "items", None):
        for item in credit.items:
            # Intentar obtener el nombre del producto, si no, usar el concepto
            prod_name = getattr(item, "product_name", getattr(item, "name", "Producto"))
            if prod_name and prod_name.startswith("gid://"):
                prod_name = "Producto"
            productos.append(ProductInfo(
                nombre=prod_name,
                cantidad=item.quantity,
                precio=item.unit_price
            ))
            subtotal += item.quantity * item.unit_price
            
    if not productos and credit:
        productos.append(ProductInfo(nombre=credit.concept or "Crédito general", cantidad=1, precio=credit.total_amount))
        subtotal = credit.total_amount

    total = credit.total_amount if credit else payment.amount
    
    saldo_a_favor = Decimal("0.00")
    if credit and credit.customer and credit.customer.favorable_balance:
        # Extraemos el saldo a favor actual
        saldo_a_favor = Decimal(str(credit.customer.favorable_balance))
    
    cuotas = None
    if credit and getattr(credit, "installments", None):
        cuotas_activas = [i for i in credit.installments if not i.paid]
        if cuotas_activas:
            cuotas = QuotaInfo(
                cantidad=len(cuotas_activas),
                valorCuota=cuotas_activas[0].amount
            )

    fecha_str = credit.created_at.strftime("%d de %B, %Y") if credit else datetime.utcnow().strftime("%d de %B, %Y")
    
    # Extract payment settings from relationship
    settings_dict = {}
    if merchant and getattr(merchant, "payment_settings", None):
        settings_dict = {s.method_name: s.settings_data for s in merchant.payment_settings if s.settings_data}
        
    pm_settings = settings_dict.get("pago_movil", {})
    tr_settings = settings_dict.get("transferencia", {})
    binance_settings = settings_dict.get("binance", {})
    zelle_settings = settings_dict.get("zelle", {})
    zinli_settings = settings_dict.get("zinli", {})
    debito_settings = settings_dict.get("debito", {})
    
    metodos = []
    if pm_settings and pm_settings.get("banco"): metodos.append("Pago Móvil")
    if tr_settings and tr_settings.get("banco"): metodos.append("Transferencia Bancaria")
    if binance_settings and binance_settings.get("enabled"): metodos.append("Binance")
    if zelle_settings and zelle_settings.get("enabled"): metodos.append("Zelle")
    if zinli_settings and zinli_settings.get("enabled"): metodos.append("Zinli")
    if debito_settings and debito_settings.get("enabled"): metodos.append("Débito")

    destino = DestinoInfo()
    if pm_settings:
        destino.banco = pm_settings.get("banco", "")
        tipo = pm_settings.get("tipoCi", "")
        ci = pm_settings.get("ci", "")
        destino.rif = f"{tipo}-{ci}" if tipo and ci else (tipo or ci or "")
        destino.telefono = pm_settings.get("telefono", "")
    if tr_settings:
        if not destino.banco: destino.banco = tr_settings.get("banco", "")
        if not destino.rif:
            tipo = tr_settings.get("tipoCi", "")
            ci = tr_settings.get("ci", "")
            destino.rif = f"{tipo}-{ci}" if tipo and ci else (tipo or ci or "")
        destino.cuenta = tr_settings.get("numero", "")

    return PaymentInfoResponse(
        numeroOrden=str(credit.id) if credit else str(payment.id),
        fecha=fecha_str,
        tienda=merchant.shop_domain if merchant else "Comercio",
        productos=productos,
        subtotal=subtotal,
        iva=Decimal("0.00"),
        total=total,
        cuotas=cuotas,
        estado="Pendiente de Pago",
        metodosAceptados=metodos,
        cuentaDestino=destino,
        binanceDestino=binance_settings if binance_settings else None,
        zelleDestino=zelle_settings if zelle_settings else None,
        zinliDestino=zinli_settings if zinli_settings else None,
        debitoDestino=debito_settings if debito_settings else None,
        customer_name=credit.customer.full_name if credit and credit.customer else "Cliente",
        customer_email=pt.customer_email or "N/A",
        saldo_a_favor=saldo_a_favor
    )


@router.post("/payment-proof")
def submit_payment_proof(payload: ProofSubmission, db: Session = Depends(get_db)):
    pt = db.query(PaymentToken).filter(PaymentToken.token == payload.token).first()
    if not pt:
        raise HTTPException(status_code=404, detail="Token inválido.")
    if pt.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="El enlace ha expirado.")
    if pt.proof:
        raise HTTPException(status_code=409, detail="Ya se reportó un comprobante para este pago.")

    from models.enums import PaymentStatus
    payment = db.query(Payment).filter(Payment.id == pt.payment_id).first()

    notes_parts = []
    if payload.document_type and payload.document_number:
        notes_parts.append(f"Doc: {payload.document_type}-{payload.document_number}")
    if payload.phone_number:
        notes_parts.append(f"Teléf: {payload.phone_number}")
    if payload.account_number:
        notes_parts.append(f"Cuenta: {payload.account_number}")
    if payload.notes:
        notes_parts.append(payload.notes)

    if payment:
        # Verificar si la referencia ya existe para este merchant (en OTRO pago)
        existing_payment = db.query(Payment).join(
            Credit, Credit.id == Payment.credit_id
        ).join(
            Customer, Customer.id == Credit.customer_id
        ).filter(
            Customer.merchant_id == pt.merchant_id,
            Payment.reference_number == payload.reference_number,
            Payment.id != pt.payment_id
        ).first()
        
        if existing_payment:
            raise HTTPException(
                status_code=400, 
                detail=f"La referencia {payload.reference_number} ya ha sido registrada anteriormente. Por favor verifique el número."
            )

        expected_amount = Decimal(str(payment.amount))
        declared_amount = Decimal(str(payload.amount))

        if declared_amount > expected_amount:
            diff = declared_amount - expected_amount
            notes_parts.append(f"[OVERPAYMENT: {diff}]")
        elif declared_amount < expected_amount:
            notes_parts.append(f"[PARTIAL_PAYMENT: paid {declared_amount} of {expected_amount}]")

        payment.status = PaymentStatus.EN_REVISION
        payment.amount = declared_amount
        payment.reference_number = payload.reference_number
        
        # Mapear el tipo de método dinamicamente (Pago móvil o Transf.)
        payment.payment_method = "PAGO_MOVIL" if payload.phone_number else "BANK"
        payment.bank_name = payload.bank_name
        
        payment.notes = " | ".join(notes_parts)
        payment.updated_at = datetime.utcnow()
        db.add(payment)

    proof = PaymentProof(
        token_id=pt.id,
        reference_number=payload.reference_number,
        bank_name=payload.bank_name,
        amount=payload.amount,
        notes=" | ".join(notes_parts),
        status="PENDIENTE",
    )
    pt.used_at = datetime.utcnow()
    db.add(proof)

    # Log notification in AuditLog for the merchant dashboard
    try:
        from models.merchant_payment_settings import MerchantPaymentSetting
        # Check if notifications are silenced
        silence_notifications = False
        general_settings = db.query(MerchantPaymentSetting).filter(
            MerchantPaymentSetting.merchant_id == pt.merchant_id,
            MerchantPaymentSetting.method_name == "general"
        ).first()
        if general_settings and general_settings.settings_data:
            silence_notifications = general_settings.settings_data.get("silence_notifications", False)

        if not silence_notifications:
            from models.audit_log import AuditLog
            customer_name = "Cliente"
            credit_id = "N/A"
            installment_number = "Fiado (sin cuotas)"
            
            if payment:
                if payment.credit:
                    credit_id = str(payment.credit.id)
                    if payment.credit.customer:
                        customer_name = payment.credit.customer.full_name
                if payment.installment_id and payment.credit:
                    inst = next((i for i in payment.credit.installments if i.id == payment.installment_id), None)
                    if inst:
                        installment_number = str(inst.number)

            msg = f"Cliente {customer_name} realizó el pago de cuota #{installment_number} del Crédito #{credit_id}. Por favor, verificalo."
            
            notification = AuditLog(
                merchant_id=pt.merchant_id,
                entity_name="NOTIFICATION",
                entity_id=str(payment.id) if payment else "0",
                action="PAYMENT_SUBMITTED",
                changes={
                    "message": msg,
                    "is_read": False,
                    "payment_id": payment.id if payment else None,
                    "customer_name": customer_name,
                    "credit_id": credit_id,
                }
            )
            db.add(notification)
    except Exception as e:
        print("[submit_payment_proof] Error creating notification log:", e)

    db.commit()
    db.refresh(proof)
    return {"ok": True, "mensaje": "Comprobante recibido exitosamente. El equipo lo revisará en breve."}

