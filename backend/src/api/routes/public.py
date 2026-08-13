# app/api/routes/public.py
# These endpoints are PUBLIC — no X-Merchant-ID required.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
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


def _assert_reminder_payment_open(payment: Payment | None, credit: Credit | None) -> None:
    """Bloquea links de recordatorio si el cobro o el crédito ya no admiten pago."""
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado.")

    p_status = getattr(payment.status, "value", payment.status)
    if p_status != "REGISTRADO":
        raise HTTPException(
            status_code=410,
            detail="Este enlace ya no está disponible (el cobro fue anulado o ya no está pendiente).",
        )

    if credit is not None:
        c_status = getattr(credit.status, "value", credit.status)
        if c_status == "CANCELADO":
            raise HTTPException(
                status_code=410,
                detail="El crédito asociado fue cancelado. Este enlace ya no es válido.",
            )
        if c_status == "PAGADO":
            raise HTTPException(
                status_code=410,
                detail="El crédito asociado ya está pagado. Este enlace ya no es válido.",
            )


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
    # Legacy (fusionado). Preferir pagoMovilDestino / transferenciaDestino.
    cuentaDestino: DestinoInfo
    pagoMovilDestino: Optional[DestinoInfo] = None
    transferenciaDestino: Optional[DestinoInfo] = None
    binanceDestino: Optional[dict] = None
    zelleDestino: Optional[dict] = None
    zinliDestino: Optional[dict] = None
    debitoDestino: Optional[dict] = None
    customer_name: str
    customer_email: str
    saldo_a_favor: Decimal = Decimal("0.00")


def _format_rif(settings: dict) -> str:
    tipo = (settings or {}).get("tipoCi", "") or ""
    ci = (settings or {}).get("ci", "") or ""
    if tipo and ci:
        return f"{tipo}-{ci}"
    return tipo or ci or ""


@router.get("/bcv-rate", summary="Tasa oficial Bs/USD (proxy servidor)")
def get_bcv_rate():
    """
    Expone la tasa BCV al formulario público sin que el browser hable con Google Sheets.
    """
    from services.bcv_rate import fetch_bcv_rate

    return fetch_bcv_rate()


class ProofSubmission(BaseModel):
    token: str
    reference_number: str
    bank_name: str
    amount: Decimal
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    phone_number: Optional[str] = None
    account_number: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


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
    _assert_reminder_payment_open(payment, credit)
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
            if not isinstance(prod_name, str):
                prod_name = "Producto"
            elif prod_name.startswith("gid://"):
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
                valorCuota=payment.amount
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
    # Requiere dato útil (no solo banco default) para listar el método
    if pm_settings and (pm_settings.get("telefono") or "").strip():
        metodos.append("Pago Móvil")
    if tr_settings and (tr_settings.get("numero") or "").strip():
        metodos.append("Transferencia Bancaria")
    if binance_settings and binance_settings.get("enabled"): metodos.append("Binance")
    if zelle_settings and zelle_settings.get("enabled"): metodos.append("Zelle")
    if zinli_settings and zinli_settings.get("enabled"): metodos.append("Zinli")
    if debito_settings and debito_settings.get("enabled"): metodos.append("Débito")

    pago_movil_destino = None
    if pm_settings:
        pago_movil_destino = DestinoInfo(
            banco=pm_settings.get("banco") or None,
            rif=_format_rif(pm_settings) or None,
            telefono=pm_settings.get("telefono") or None,
        )

    transferencia_destino = None
    if tr_settings:
        transferencia_destino = DestinoInfo(
            banco=tr_settings.get("banco") or None,
            rif=_format_rif(tr_settings) or None,
            cuenta=tr_settings.get("numero") or None,
        )

    # Compat: un solo objeto con ambos datos, sin que un método pise el banco/RIF del otro.
    # Los clientes nuevos deben usar pagoMovilDestino / transferenciaDestino.
    destino = DestinoInfo(
        banco=(pago_movil_destino.banco if pago_movil_destino else None)
            or (transferencia_destino.banco if transferencia_destino else None),
        rif=(pago_movil_destino.rif if pago_movil_destino else None)
            or (transferencia_destino.rif if transferencia_destino else None),
        telefono=pago_movil_destino.telefono if pago_movil_destino else None,
        cuenta=transferencia_destino.cuenta if transferencia_destino else None,
    )

    return PaymentInfoResponse(
        numeroOrden=str(credit.id) if credit else str(payment.id),
        fecha=fecha_str,
        tienda=merchant.shop_domain if merchant else "Comercio",
        productos=productos,
        subtotal=subtotal,
        iva=Decimal("0.00"),
        total=total,
        cuotas=cuotas,
        metodosAceptados=metodos,
        cuentaDestino=destino,
        pagoMovilDestino=pago_movil_destino,
        transferenciaDestino=transferencia_destino,
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
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto del pago debe ser mayor a cero.")

    from models.enums import PaymentStatus
    payment = db.query(Payment).filter(Payment.id == pt.payment_id).first()
    credit = None
    if payment:
        credit = db.query(Credit).filter(Credit.id == payment.credit_id).first()
    _assert_reminder_payment_open(payment, credit)

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
        
        # Fecha de registro del pago = timestamp del reporte público (base de puntualidad/mora)
        payment.payment_date = datetime.utcnow()
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
    if payment:
        from services.email import notify_payment_status_change
        db.refresh(payment)
        notify_payment_status_change(
            payment,
            credit=payment.credit,
            previous_status="REGISTRADO",
        )
    return {"ok": True, "mensaje": "Comprobante recibido exitosamente. El equipo lo revisará en breve."}

# ==========================================
# Shopify GDPR Webhooks (Mandatory for App Store)
# ==========================================
from fastapi import Request

@router.post("/webhooks/customers/data_request")
async def customers_data_request(request: Request):
    # Payload indicates customer requesting their data.
    return {"status": "ok"}

@router.post("/webhooks/customers/redact")
async def customers_redact(request: Request):
    # Payload indicates customer requesting data deletion.
    return {"status": "ok"}

@router.post("/webhooks/shop/redact")
async def shop_redact(request: Request):
    # Payload indicates store uninstalling and requesting data deletion.
    return {"status": "ok"}
