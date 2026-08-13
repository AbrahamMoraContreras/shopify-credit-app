# app/services/email.py
import resend
from typing import Optional
from core.config import settings

# Estados de crédito que generan correo al cliente (no EN_PROGRESO).
CREDIT_STATUS_NOTIFY = frozenset({"EMITIDO", "PAGADO", "CANCELADO", "MOROSO"})

_STATUS_LABELS = {
    "EMITIDO": "Emitido",
    "PAGADO": "Pagado",
    "CANCELADO": "Cancelado",
    "MOROSO": "Moroso",
}


def send_payment_reminder(
    to_email: str,
    customer_name: str,
    installment_number: Optional[int],
    amount: float,
    due_date: Optional[str],
    payment_url: str,
    merchant_name: str = "El Comercio",
) -> bool:
    """Send a payment reminder email via Resend."""
    if not settings.RESEND_API_KEY:
        print("[email] RESEND_API_KEY not set — skipping email send.")
        return False

    resend.api_key = settings.RESEND_API_KEY

    installment_label = f"Cuota #{installment_number}" if installment_number else "Pago"
    due_label = f"Fecha límite: <strong>{due_date}</strong><br/>" if due_date else ""

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:#333;">Recordatorio de Pago</h2>
      <p>Hola, <strong>{customer_name}</strong>.</p>
      <p>Te escribimos para recordarte que tienes un pago pendiente con <strong>{merchant_name}</strong>:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#555;">Concepto:</td><td style="padding:8px;font-weight:bold;">{installment_label}</td></tr>
        <tr><td style="padding:8px;color:#555;">Monto:</td><td style="padding:8px;font-weight:bold;">${amount:.2f} USD</td></tr>
        <tr><td style="padding:8px;color:#555;">{due_label}</td></tr>
      </table>
      <p>Una vez que realices la transferencia o pago, confirma tu pago haciendo clic en el siguiente botón:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{payment_url}" style="background:#5C6AC4;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;">
          Confirmar mi Pago
        </a>
      </div>
      <p style="color:#999;font-size:12px;">Este enlace es de uso único y expirará en 72 horas. Si ya realizaste tu pago, ignora este mensaje.</p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"Recordatorio de pago — {installment_label} por ${amount:.2f}",
            "html": html_body,
        })
        return True
    except Exception as e:
        print(f"[email] Error sending email: {e}")
        return False


def _credit_status_copy(
    status: str,
    customer_name: str,
    credit_id: int,
    concept: str,
    merchant_name: str,
) -> tuple[str, str, str]:
    """Return (subject, heading, body_html_extra) for a credit status email."""
    concept_line = f" del crédito <strong>#{credit_id}</strong>"
    if concept:
        concept_line += f" ({concept})"

    if status == "EMITIDO":
        subject = f"Tu crédito #{credit_id} fue emitido"
        heading = "Crédito emitido"
        extra = f"""
          <p>Tu crédito con <strong>{merchant_name}</strong> ha sido <strong>emitido</strong>{concept_line}.</p>
          <p>Ya puedes consultar el detalle de tus cuotas y fechas de pago con el comercio.</p>
        """
    elif status == "PAGADO":
        subject = f"¡Felicitaciones! Tu crédito #{credit_id} está pagado"
        heading = "¡Felicitaciones!"
        extra = f"""
          <p>¡Excelente noticia, <strong>{customer_name}</strong>!</p>
          <p>Has <strong>finalizado exitosamente</strong> tu crédito{concept_line} con <strong>{merchant_name}</strong>.</p>
          <p>Agradecemos tu puntualidad y compromiso. ¡Felicitaciones por completar tu financiamiento!</p>
        """
    elif status == "CANCELADO":
        subject = f"Tu crédito #{credit_id} fue cancelado"
        heading = "Crédito cancelado"
        extra = f"""
          <p>Te informamos que tu crédito{concept_line} con <strong>{merchant_name}</strong> ha sido <strong>cancelado</strong>.</p>
          <p>Si tienes dudas, contacta directamente al comercio.</p>
        """
    elif status == "MOROSO":
        subject = f"Aviso: tu crédito #{credit_id} está en mora"
        heading = "Crédito en mora"
        extra = f"""
          <p>Te informamos que tu crédito{concept_line} con <strong>{merchant_name}</strong> figura en estado <strong>moroso</strong> por cuotas vencidas pendientes.</p>
          <p>Te recomendamos ponerte al día lo antes posible para regularizar tu situación.</p>
        """
    else:
        label = _STATUS_LABELS.get(status, status.replace("_", " "))
        subject = f"Actualización de tu crédito #{credit_id}: {label}"
        heading = f"Estado: {label}"
        extra = f"""
          <p>El estado de tu crédito{concept_line} con <strong>{merchant_name}</strong> ahora es <strong>{label}</strong>.</p>
        """
    return subject, heading, extra


def send_credit_status_email(
    to_email: str,
    customer_name: str,
    credit_id: int,
    status: str,
    concept: str = "",
    merchant_name: str = "El Comercio",
    balance: Optional[float] = None,
) -> bool:
    """Notify the customer that their credit status changed (via Resend)."""
    if not settings.RESEND_API_KEY:
        print("[email] RESEND_API_KEY not set — skipping credit status email.")
        return False
    if not to_email or not str(to_email).strip():
        print(f"[email] No email for credit #{credit_id} — skipping status notify.")
        return False

    status_key = getattr(status, "value", status)
    if status_key not in CREDIT_STATUS_NOTIFY:
        return False

    resend.api_key = settings.RESEND_API_KEY
    subject, heading, extra = _credit_status_copy(
        status_key, customer_name, credit_id, concept or "", merchant_name
    )
    label = _STATUS_LABELS.get(status_key, status_key.replace("_", " "))
    balance_row = ""
    if balance is not None and status_key not in ("PAGADO", "CANCELADO"):
        balance_row = (
            f'<tr><td style="padding:8px;color:#555;">Saldo pendiente:</td>'
            f'<td style="padding:8px;font-weight:bold;">${float(balance):.2f} USD</td></tr>'
        )

    accent = "#16a34a" if status_key == "PAGADO" else "#333"
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:{accent};">{heading}</h2>
      <p>Hola, <strong>{customer_name}</strong>.</p>
      {extra}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#555;">Crédito:</td><td style="padding:8px;font-weight:bold;">#{credit_id}</td></tr>
        <tr><td style="padding:8px;color:#555;">Estado:</td><td style="padding:8px;font-weight:bold;">{label}</td></tr>
        {balance_row}
      </table>
      <p style="color:#999;font-size:12px;">Este mensaje es informativo. Si no reconoces esta operación, contacta a {merchant_name}.</p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email.strip()],
            "subject": subject,
            "html": html_body,
        })
        return True
    except Exception as e:
        print(f"[email] Error sending credit status email: {e}")
        return False


def notify_credit_status_change(
    credit,
    previous_status=None,
    merchant_name: Optional[str] = None,
) -> bool:
    """
    Send status email only when credit transitions into EMITIDO/PAGADO/CANCELADO/MOROSO.
    Never notifies EN_PROGRESO. Safe after commit; failures are logged, not raised.
    """
    new_status = getattr(credit.status, "value", credit.status)
    prev = (
        getattr(previous_status, "value", previous_status)
        if previous_status is not None
        else None
    )
    if new_status not in CREDIT_STATUS_NOTIFY or prev == new_status:
        return False

    customer = getattr(credit, "customer", None)
    if not customer:
        print(f"[email] Credit #{credit.id} has no customer loaded — skip status notify.")
        return False

    name = merchant_name
    if not name and getattr(customer, "merchant", None):
        domain = getattr(customer.merchant, "shop_domain", None) or ""
        name = domain.replace(".myshopify.com", "") or "El Comercio"
    if not name:
        name = "El Comercio"

    return send_credit_status_email(
        to_email=customer.email or "",
        customer_name=customer.full_name or "Cliente",
        credit_id=credit.id,
        status=new_status,
        concept=getattr(credit, "concept", "") or "",
        merchant_name=name,
        balance=float(credit.balance) if credit.balance is not None else None,
    )


# Estados de cobro que generan correo al cliente.
PAYMENT_STATUS_NOTIFY = frozenset({"RECHAZADO", "CANCELADO", "EN_REVISION", "APROBADO"})

_PAYMENT_STATUS_LABELS = {
    "RECHAZADO": "Rechazado",
    "CANCELADO": "Anulado",
    "EN_REVISION": "En revisión",
    "APROBADO": "Aprobado",
}


def _payment_status_copy(
    status: str,
    customer_name: str,
    payment_id: int,
    credit_id: int,
    amount: float,
    merchant_name: str,
) -> tuple[str, str, str]:
    label = _PAYMENT_STATUS_LABELS.get(status, status.replace("_", " "))
    if status == "RECHAZADO":
        subject = f"Tu cobro #{payment_id} fue rechazado"
        heading = "Cobro rechazado"
        extra = f"""
          <p>Te informamos que el cobro <strong>#{payment_id}</strong> (crédito <strong>#{credit_id}</strong>)
          por <strong>${amount:.2f} USD</strong> con <strong>{merchant_name}</strong> fue <strong>rechazado</strong>.</p>
          <p>Si crees que se trata de un error, contacta al comercio para reenviar el comprobante o aclarar la operación.</p>
        """
    elif status == "CANCELADO":
        subject = f"Tu cobro #{payment_id} fue anulado"
        heading = "Cobro anulado"
        extra = f"""
          <p>Te informamos que el cobro <strong>#{payment_id}</strong> (crédito <strong>#{credit_id}</strong>)
          por <strong>${amount:.2f} USD</strong> con <strong>{merchant_name}</strong> fue <strong>anulado</strong>.</p>
          <p>Si tienes dudas, contacta directamente al comercio.</p>
        """
    elif status == "EN_REVISION":
        subject = f"Tu cobro #{payment_id} está en revisión"
        heading = "Cobro en revisión"
        extra = f"""
          <p>Hola, <strong>{customer_name}</strong>.</p>
          <p>Tu cobro <strong>#{payment_id}</strong> (crédito <strong>#{credit_id}</strong>)
          por <strong>${amount:.2f} USD</strong> con <strong>{merchant_name}</strong> está <strong>en revisión</strong>.</p>
          <p>Te avisaremos cuando el comercio confirme el resultado de la validación.</p>
        """
    elif status == "APROBADO":
        subject = f"Tu cobro #{payment_id} fue aprobado"
        heading = "Cobro aprobado"
        extra = f"""
          <p>¡Buenas noticias, <strong>{customer_name}</strong>!</p>
          <p>Tu cobro <strong>#{payment_id}</strong> (crédito <strong>#{credit_id}</strong>)
          por <strong>${amount:.2f} USD</strong> con <strong>{merchant_name}</strong> fue <strong>aprobado</strong>.</p>
          <p>El abono ya quedó registrado en tu crédito. ¡Gracias por tu pago!</p>
        """
    else:
        subject = f"Actualización de tu cobro #{payment_id}: {label}"
        heading = f"Estado del cobro: {label}"
        extra = f"""
          <p>El cobro <strong>#{payment_id}</strong> (crédito <strong>#{credit_id}</strong>)
          ahora figura como <strong>{label}</strong>.</p>
        """
    return subject, heading, extra


def send_payment_status_email(
    to_email: str,
    customer_name: str,
    payment_id: int,
    credit_id: int,
    status: str,
    amount: float,
    merchant_name: str = "El Comercio",
    reference_number: Optional[str] = None,
) -> bool:
    """Notify the customer that a payment/cobro status changed (via Resend)."""
    if not settings.RESEND_API_KEY:
        print("[email] RESEND_API_KEY not set — skipping payment status email.")
        return False
    if not to_email or not str(to_email).strip():
        print(f"[email] No email for payment #{payment_id} — skipping status notify.")
        return False

    status_key = getattr(status, "value", status)
    if status_key not in PAYMENT_STATUS_NOTIFY:
        return False

    resend.api_key = settings.RESEND_API_KEY
    subject, heading, extra = _payment_status_copy(
        status_key,
        customer_name,
        payment_id,
        credit_id,
        float(amount),
        merchant_name,
    )
    label = _PAYMENT_STATUS_LABELS.get(status_key, status_key.replace("_", " "))
    ref_row = ""
    if reference_number:
        ref_row = (
            f'<tr><td style="padding:8px;color:#555;">Referencia:</td>'
            f'<td style="padding:8px;font-weight:bold;">{reference_number}</td></tr>'
        )

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px;">
      <h2 style="color:#333;">{heading}</h2>
      {extra}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#555;">Cobro:</td><td style="padding:8px;font-weight:bold;">#{payment_id}</td></tr>
        <tr><td style="padding:8px;color:#555;">Crédito:</td><td style="padding:8px;font-weight:bold;">#{credit_id}</td></tr>
        <tr><td style="padding:8px;color:#555;">Monto:</td><td style="padding:8px;font-weight:bold;">${float(amount):.2f} USD</td></tr>
        <tr><td style="padding:8px;color:#555;">Estado:</td><td style="padding:8px;font-weight:bold;">{label}</td></tr>
        {ref_row}
      </table>
      <p style="color:#999;font-size:12px;">Este mensaje es informativo. Si no reconoces esta operación, contacta a {merchant_name}.</p>
    </div>
    """

    try:
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email.strip()],
            "subject": subject,
            "html": html_body,
        })
        return True
    except Exception as e:
        print(f"[email] Error sending payment status email: {e}")
        return False


def notify_payment_status_change(
    payment,
    credit=None,
    previous_status=None,
    merchant_name: Optional[str] = None,
) -> bool:
    """
    Send email when a cobro transitions into RECHAZADO, CANCELADO, EN_REVISION or APROBADO.
    Safe after commit; failures are logged, not raised.
    """
    new_status = getattr(payment.status, "value", payment.status)
    prev = (
        getattr(previous_status, "value", previous_status)
        if previous_status is not None
        else None
    )
    if new_status not in PAYMENT_STATUS_NOTIFY or prev == new_status:
        return False

    credit = credit or getattr(payment, "credit", None)
    customer = getattr(credit, "customer", None) if credit else None
    if not customer:
        print(f"[email] Payment #{payment.id} has no customer — skip status notify.")
        return False

    name = merchant_name
    if not name and getattr(customer, "merchant", None):
        domain = getattr(customer.merchant, "shop_domain", None) or ""
        name = domain.replace(".myshopify.com", "") or "El Comercio"
    if not name:
        name = "El Comercio"

    return send_payment_status_email(
        to_email=customer.email or "",
        customer_name=customer.full_name or "Cliente",
        payment_id=payment.id,
        credit_id=credit.id if credit else getattr(payment, "credit_id", 0),
        status=new_status,
        amount=float(payment.amount) if payment.amount is not None else 0.0,
        merchant_name=name,
        reference_number=getattr(payment, "reference_number", None),
    )
