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
    estado: str
    metodosAceptados: List[str]
    cuentaDestino: DestinoInfo
    customer_name: str
    customer_email: str


class ProofSubmission(BaseModel):
    token: str
    reference_number: str
    bank_name: str
    amount: Decimal
    document_type: str
    document_number: str
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
    
    cuotas = None
    if credit and getattr(credit, "installments", None):
        cuotas_activas = [i for i in credit.installments if not i.paid]
        if cuotas_activas:
            cuotas = QuotaInfo(
                cantidad=len(cuotas_activas),
                valorCuota=cuotas_activas[0].amount
            )

    fecha_str = credit.created_at.strftime("%d de %B, %Y") if credit else datetime.utcnow().strftime("%d de %B, %Y")
    
    pm_settings = getattr(merchant, "pago_movil_settings", {}) or {}
    tr_settings = getattr(merchant, "transferencia_settings", {}) or {}
    
    metodos = []
    if pm_settings: metodos.append("Pago Móvil")
    if tr_settings: metodos.append("Transferencia Bancaria")

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
        customer_name=credit.customer.full_name if credit and credit.customer else "Cliente",
        customer_email=pt.customer_email or "N/A"
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

    notes_parts = [f"Doc: {payload.document_type}-{payload.document_number}"]
    if payload.phone_number:
        notes_parts.append(f"Teléf: {payload.phone_number}")
    if payload.account_number:
        notes_parts.append(f"Cuenta: {payload.account_number}")
    if payload.notes:
        notes_parts.append(f"Extra: {payload.notes}")

    if payment:
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
        payment.payment_method = payload.bank_name
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
    db.commit()
    db.refresh(proof)
    return {"ok": True, "mensaje": "Comprobante recibido exitosamente. El equipo lo revisará en breve."}

