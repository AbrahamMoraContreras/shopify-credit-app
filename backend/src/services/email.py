# app/services/email.py
import resend
from typing import Optional
from core.config import settings


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
