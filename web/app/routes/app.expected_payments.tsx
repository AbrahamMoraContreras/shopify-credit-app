'use client'

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";

interface ExpectedPayment {
  credit_id: number;
  installment_id?: number | null;
  customer_name: string;
  customer_email?: string;
  installment_number?: number | null;
  due_date?: string | null;
  expected_amount: number;
  status: string;
}

export default function ExpectedPayments() {
  const { merchantId } = useOutletContext<{ merchantId: string }>();
  const [payments, setPayments] = useState<ExpectedPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<Record<string, string>>({});

  async function loadExpectedPayments() {
    if (!merchantId) return;
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/api/payments/expected`, {
        headers: { "X-Merchant-ID": String(merchantId) },
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Error loading expected payments:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExpectedPayments();
  }, [merchantId]);

  const handleSendReminder = async (payment: ExpectedPayment) => {
    let email = payment.customer_email;
    
    if (!email) {
      const promptedEmail = window.prompt("El cliente no tiene email registrado. Por favor, ingréselo para enviar el recordatorio:");
      if (!promptedEmail) return;
      if (!promptedEmail.includes("@")) {
          alert("Email no válido.");
          return;
      }
      email = promptedEmail;
    }

    // Unique key for installment
    const key = payment.installment_id ? `${payment.credit_id}-${payment.installment_id}` : `${payment.credit_id}-fiado`;
    setReminderStatus(s => ({ ...s, [key]: 'sending' }));
    try {
      const res = await fetch(`http://localhost:8000/api/payments/payment-tokens`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "X-Merchant-ID": String(merchantId) 
        },
        body: JSON.stringify({ 
          credit_id: payment.credit_id,
          installment_id: payment.installment_id || null,
          amount: payment.expected_amount,
          customer_email: email 
        })
      });
      
      if (res.ok) {
        setReminderStatus(s => ({ ...s, [key]: 'sent' }));
        if (!payment.customer_email) {
            setPayments(prev => prev.map(p => 
                (p.credit_id === payment.credit_id && p.installment_id === payment.installment_id) 
                ? { ...p, customer_email: email } 
                : p
            ));
        }
      } else {
        setReminderStatus(s => ({ ...s, [key]: 'error' }));
      }
    } catch {
      setReminderStatus(s => ({ ...s, [key]: 'error' }));
    }

    setTimeout(() => setReminderStatus(s => ({ ...s, [key]: 'idle' })), 4000);
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "PENDIENTE": return "info";
      case "VENCIDO": return "critical";
      default: return "neutral";
    }
  };

  return (
    <s-page heading="Pagos Esperados" inlineSize="large">
      <s-section padding="base">
        <s-heading>Cuotas y Saldos por Cobrar</s-heading>
        <s-text color="subdued">Visualiza las cuotas pendientes de todos los créditos activos y envía recordatorios de pago.</s-text>
        <s-box paddingBlockStart="base">
            <s-table loading={loading || undefined}>
            <s-table-header-row>
                <s-table-header format="numeric">Crédito ID</s-table-header>
                <s-table-header>Cliente</s-table-header>
                <s-table-header>Vencimiento</s-table-header>
                <s-table-header format="numeric">Nro Cuota</s-table-header>
                <s-table-header format="numeric">Monto Esperado</s-table-header>
                <s-table-header>Estado</s-table-header>
                <s-table-header>Acciones</s-table-header>
            </s-table-header-row>
            <s-table-body>
                {payments.map((payment) => {
                  const key = payment.installment_id ? `${payment.credit_id}-${payment.installment_id}` : `${payment.credit_id}-fiado`;
                  return (
                    <s-table-row key={key}>
                    <s-table-cell>{payment.credit_id}</s-table-cell>
                    <s-table-cell>
                        <s-stack gap="none">
                        <s-text type="strong">{payment.customer_name}</s-text>
                        <s-text color="subdued">{payment.customer_email || "Sin email"}</s-text>
                        </s-stack>
                    </s-table-cell>
                    <s-table-cell>{payment.due_date ? new Date(payment.due_date).toLocaleDateString() : 'Pendiente'}</s-table-cell>
                    <s-table-cell>{payment.installment_number ? payment.installment_number : 'Fiado (Total)'}</s-table-cell>
                    <s-table-cell>${payment.expected_amount.toFixed(2)}</s-table-cell>
                    <s-table-cell>
                        <s-badge tone={getStatusTone(payment.status)}>
                        {payment.status}
                        </s-badge>
                    </s-table-cell>
                    <s-table-cell>
                        <s-button-group>
                        <s-button 
                            slot="secondary-actions" 
                            icon="view" 
                            href={`/app/credit_detail/${payment.credit_id}`}
                        >
                            Ver Detalles
                        </s-button>
                        <s-button
                            slot="secondary-actions"
                            tone="auto"
                            disabled={reminderStatus[key] === 'sending' || undefined}
                            onClick={() => handleSendReminder(payment)}
                        >
                            {reminderStatus[key] === 'sending' ? 'Enviando...' : 
                            reminderStatus[key] === 'sent' ? '¡Enviado!' : 
                            reminderStatus[key] === 'error' ? 'Reintentar' : 'Enviar Recordatorio'}
                        </s-button>
                        </s-button-group>
                    </s-table-cell>
                    </s-table-row>
                  );
                })}
                {!loading && payments.length === 0 && (
                <s-table-row>
                    <s-table-cell>
                    <div style={{ textAlign: 'center', gridColumn: 'span 7' }}>
                        <s-text color="subdued">No hay pagos esperados en este momento.</s-text>
                    </div>
                    </s-table-cell>
                </s-table-row>
                )}
            </s-table-body>
            </s-table>
        </s-box>
      </s-section>
    </s-page>
  );
}
