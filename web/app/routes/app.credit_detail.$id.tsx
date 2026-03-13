'use client'

import { useParams, useSubmit, useNavigation, useActionData } from 'react-router';
import { useEffect, useState } from 'react';
import { useOutletContext, redirect } from 'react-router';
import type { Credit, PaymentResponse } from 'web/app/types/credit';
import type { ActionFunctionArgs } from "react-router";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");
  const merchantId = formData.get("merchantId");

  if (intent === "approve") {
    const concept = formData.get("concept");
    try {
      const response = await fetch(`http://localhost:8000/api/credits/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Merchant-ID": String(merchantId),
        },
        body: JSON.stringify({
          status: "EMITIDO",
          concept: concept
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || "Error al aprobar el crédito" };
      }
      return { success: true };
    } catch (error) {
      return { error: "Error de conexión" };
    }
  }
  return null;
};

export default function CreditDetail() {
  const { id } = useParams();
  const { merchantId } = useOutletContext<{ merchantId: string }>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string, success?: boolean }>();
  const isSubmitting = navigation.state === "submitting";

  const [credit, setCredit] = useState<Credit>();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editConcept, setEditConcept] = useState("");
  const [reminderStatus, setReminderStatus] = useState<Record<string, 'idle'|'sending'|'sent'|'error'>>({});

  const loadCredit = async () => {
    if (!id || !merchantId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`http://localhost:8000/api/credits/${id}`, {
        headers: { "X-Merchant-ID": merchantId },
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data: Credit = await response.json();
      setCredit(data);
      setEditConcept(data.concept);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredit();
  }, [id, merchantId]);

  useEffect(() => {
    if (actionData?.success) {
        setIsEditing(false);
        loadCredit();
    }
  }, [actionData]);

  useEffect(() => {
    if (!credit?.id || !merchantId) return;
    async function loadPayments() {
      try {
        const response = await fetch(`http://localhost:8000/api/credits/payments/by-credit/${id}`, {
          headers: { "X-Merchant-ID": merchantId },
        });
        if (response.ok) {
          const data: PaymentResponse[] = await response.json();
          setPayments(data);
        }
      } catch (err) { console.error(err); }
    }
    void loadPayments();
  }, [credit?.id, merchantId]);

  const handleApprove = () => {
    const formData = new FormData();
    formData.append("intent", "approve");
    formData.append("merchantId", merchantId);
    formData.append("concept", editConcept);
    submit(formData, { method: "post" });
  };
  const approvedPayments = payments.filter(p => p.status === 'APROBADO');
  const lastPayment = approvedPayments.length > 0 ? approvedPayments[0] : null;
  const lastPaymentAmount = lastPayment ? Number(lastPayment.amount) : 0;
  
  const totalPaid = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingDebt = Number(credit?.total_amount ?? 0) - totalPaid;

  const handleSendReminder = async (installmentId: number | null, expectedAmount: number) => {
    let email = credit?.customer?.email;
    
    if (!email) {
      const promptEmail = window.prompt("El cliente no tiene email registrado. Por favor, ingréselo para enviar el recordatorio:");
      if (!promptEmail) return;
      if (!promptEmail.includes("@")) {
          alert("Email no válido.");
          return;
      }
      email = promptEmail;
    }

    const key = installmentId !== null ? installmentId.toString() : "fiado";
    setReminderStatus(s => ({ ...s, [key]: 'sending' }));
    
    try {
      const res = await fetch(`http://localhost:8000/api/payments/payment-tokens`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          "X-Merchant-ID": String(merchantId) 
        },
        body: JSON.stringify({ 
          credit_id: credit?.id,
          installment_id: installmentId, 
          amount: expectedAmount,
          customer_email: email 
        })
      });
      
      if (res.ok) {
        setReminderStatus(s => ({ ...s, [key]: 'sent' }));
        // Update local state if we just provided an email
        if (!credit?.customer?.email && credit?.customer) {
            setCredit({
                ...credit,
                customer: { ...credit.customer, email: email }
            });
        }
      } else {
        setReminderStatus(s => ({ ...s, [key]: 'error' }));
      }
    } catch {
      setReminderStatus(s => ({ ...s, [key]: 'error' }));
    }

    setTimeout(() => setReminderStatus(s => ({ ...s, [key]: 'idle' })), 4000);
  };

  return (
    <s-page heading="Detalles de Crédito">
      <s-button slot="primary-action" href="/app/registre_payment">
        Registrar Pago
      </s-button>

      {actionData?.error && (
        <s-banner tone="critical" title="Error" marginBottom="base">
            <s-text>{actionData.error}</s-text>
        </s-banner>
      )}

      {loading && <s-stack padding="base"><s-text>Cargando...</s-text></s-stack>}
      {error && <s-stack padding="base"><s-text tone="critical">{error}</s-text></s-stack>}

      {!loading && !error && credit && (
        <s-stack gap="base">
          {/* Header Section */}
          <s-grid gridTemplateColumns="1fr auto 1fr" alignItems="center" gap="base">
            <s-stack>
                <s-heading size="large">{credit.customer?.full_name || 'Jose Perez'}</s-heading>
            </s-stack>
            <s-stack alignItems="center" gap="tight">
                <s-heading size="medium">Detalles de orden</s-heading>
                <s-text color="subdued">ID: {credit.invoice_code || credit.id}</s-text>
                <s-badge 
                    tone={
                      credit.status === 'EMITIDO' ? 'neutral' : 
                      credit.status === 'PENDIENTE_ACTIVACION' ? 'warning' : 
                      credit.status === 'EN_PROGRESO' ? 'info' : 
                      credit.status === 'PAGADO' ? 'success' : 
                      'info'
                    }
                >
                  {credit.status}
                </s-badge>
            </s-stack>
            <s-stack alignItems="end">
                {/* Right side placeholder if needed */}
            </s-stack>
          </s-grid>

          {/* Summary Sections */}
          <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="base">
            <s-section padding="base">
                <s-heading>Último Monto Pagado</s-heading>
                <s-box textAlign="center">
                    <s-text type="strong">
                        ${lastPaymentAmount.toFixed(2)}
                    </s-text>
                </s-box>
            </s-section>
            <s-section padding="base">
                <s-heading>Monto Total del Crédito</s-heading>
                <s-box textAlign="center">
                    <s-text type="strong">
                        ${Number(credit.total_amount).toFixed(2)}
                    </s-text>
                </s-box>
            </s-section>
            <s-section padding="base">
                <s-heading>Deuda Total Restante</s-heading>
                <s-box textAlign="center">
                    <s-text type="strong">
                        ${remainingDebt.toFixed(2)}
                    </s-text>
                </s-box>
            </s-section>
          </s-grid>

          {/* Pagos Pendientes / Cuotas Section */}
          <s-section padding="base">
            <s-heading>Pagos Pendientes / Cuotas</s-heading>
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header>Vencimiento</s-table-header>
                <s-table-header format="numeric">Cuota Nro</s-table-header>
                <s-table-header format="numeric">Monto Esperado</s-table-header>
                <s-table-header>Estado</s-table-header>
                <s-table-header>Acciones</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {credit.installments_count > 0 ? (
                  credit.installments && credit.installments.length > 0 ? (
                    credit.installments
                      .sort((a: any, b: any) => a.number - b.number)
                      .map((inst: any) => {
                        const keystr = inst.id.toString();
                        return (
                          <s-table-row key={inst.id}>
                            <s-table-cell>{new Date(inst.due_date).toLocaleDateString()}</s-table-cell>
                            <s-table-cell>{inst.number} de {credit.installments_count}</s-table-cell>
                            <s-table-cell>${Number(inst.amount).toFixed(2)}</s-table-cell>
                            <s-table-cell>
                              <s-badge tone={inst.status === 'PENDIENTE' ? 'info' : (inst.status === 'VENCIDO' ? 'critical' : 'success')}>
                                {inst.status}
                              </s-badge>
                            </s-table-cell>
                            <s-table-cell>
                              {inst.status !== 'PAGADA' ? (
                                <s-button 
                                  variant="secondary" 
                                  onClick={() => handleSendReminder(inst.id, Number(inst.amount))}
                                  disabled={reminderStatus[keystr] === 'sending' || undefined}
                                  tone={reminderStatus[keystr] === 'error' ? 'critical' : (reminderStatus[keystr] === 'sent' ? 'auto' : undefined)}
                                >
                                  {reminderStatus[keystr] === 'sending' ? 'Enviando...' : 
                                  reminderStatus[keystr] === 'sent' ? '✓ Enviado' : 
                                  reminderStatus[keystr] === 'error' ? '✕ Error' : 
                                  'Enviar Recordatorio'}
                                </s-button>
                              ) : (
                                <s-text color="subdued">-</s-text>
                              )}
                            </s-table-cell>
                          </s-table-row>
                        );
                      })
                  ) : (
                    <s-table-row>
                      <s-table-cell colSpan={5}>
                        <div style={{ textAlign: 'center' }}>
                          <s-text color="subdued">No hay información de cuotas disponible</s-text>
                        </div>
                      </s-table-cell>
                    </s-table-row>
                  )
                ) : (
                  // FIADO (No installments)
                  credit.balance > 0 ? (
                    <s-table-row>
                      <s-table-cell>N/A</s-table-cell>
                      <s-table-cell>Total (Fiado)</s-table-cell>
                      <s-table-cell>${remainingDebt.toFixed(2)}</s-table-cell>
                      <s-table-cell>
                        <s-badge tone="info">PENDIENTE</s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-button 
                          variant="secondary" 
                          onClick={() => handleSendReminder(null, remainingDebt)}
                          disabled={reminderStatus["fiado"] === 'sending' || undefined}
                          tone={reminderStatus["fiado"] === 'error' ? 'critical' : (reminderStatus["fiado"] === 'sent' ? 'auto' : undefined)}
                        >
                          {reminderStatus["fiado"] === 'sending' ? 'Enviando...' : 
                          reminderStatus["fiado"] === 'sent' ? '✓ Enviado' : 
                          reminderStatus["fiado"] === 'error' ? '✕ Error' : 
                          'Enviar Recordatorio'}
                        </s-button>
                      </s-table-cell>
                    </s-table-row>
                  ) : (
                    <s-table-row>
                      <s-table-cell colSpan={5}>
                        <div style={{ textAlign: 'center' }}>
                          <s-text color="subdued">La deuda está saldada o no tiene balance restante.</s-text>
                        </div>
                      </s-table-cell>
                    </s-table-row>
                  )
                )}
              </s-table-body>
            </s-table>
          </s-section>

          {/* Historial de Abonos Section */}
          <s-section padding="base">
            <s-heading>Historial de Abonos</s-heading>
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header>Fecha</s-table-header>
                <s-table-header>Numero de referencia</s-table-header>
                <s-table-header format="numeric">Monto Abonado</s-table-header>
                <s-table-header>Estatus</s-table-header>
                <s-table-header>Detalles de Pago</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {payments.length === 0 ? (
                  <s-table-row>
                    <s-table-cell colSpan={5}>
                        <div style={{ textAlign: 'center' }}>
                            <s-text color="subdued">Sin abonos registrados ni en revisión</s-text>
                        </div>
                    </s-table-cell>
                  </s-table-row>
                ) : (
                  payments
                    .filter(p => !p.reference_number?.startsWith("INTENT-")) // Hide intent records from history
                    .map((p) => (
                    <s-table-row key={p.id}>
                      <s-table-cell>{new Date(p.payment_date).toLocaleDateString()}</s-table-cell>
                      <s-table-cell>{p.reference_number || 'N/A'}</s-table-cell>
                      <s-table-cell>${Number(p.amount).toFixed(2)}</s-table-cell>
                      <s-table-cell>
                        <s-badge tone={p.status === 'APROBADO' ? 'success' : (p.status === 'EN_REVISION' ? 'warning' : 'neutral')}>
                          {p.status}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell>
                        <s-link href={`/app/payment_detail/${p.id}`}>Ver Pago</s-link>
                      </s-table-cell>
                    </s-table-row>
                  ))
                )}
              </s-table-body>
            </s-table>
          </s-section>

          {/* Products Section */}
          <s-section padding="base">
            <s-heading>Lista de Productos</s-heading>
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header>Codigo de Producto</s-table-header>
                <s-table-header>Fecha</s-table-header>
                <s-table-header>Productos</s-table-header>
                <s-table-header format="numeric">Monto</s-table-header>
                <s-table-header>Metodo de Pago</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {(!credit.items || credit.items.length === 0) ? (
                  <s-table-row>
                    <s-table-cell>
                        <div style={{ textAlign: 'center' }}>
                            <s-text color="subdued">No hay productos vinculados</s-text>
                        </div>
                    </s-table-cell>
                  </s-table-row>
                ) : (
                  credit.items.map((item, idx) => (
                    <s-table-row key={idx}>
                      <s-table-cell>{item.product_code || item.product_id?.split('/').pop() || 'N/A'}</s-table-cell>
                      <s-table-cell>{new Date(credit.created_at).toLocaleDateString()}</s-table-cell>
                      <s-table-cell>{item.product_name}</s-table-cell>
                      <s-table-cell>${Number(item.total_price).toFixed(2)}</s-table-cell>
                      <s-table-cell>
                        <s-badge tone={credit.status === 'PAGADO' ? 'success' : 'warning'}>
                            {credit.status === 'PAGADO' ? 'Realizado' : 'Crédito'}
                        </s-badge>
                      </s-table-cell>
                    </s-table-row>
                  ))
                )}
              </s-table-body>
            </s-table>
          </s-section>

          <s-divider />
          
          <s-stack direction="inline" padding="base" justifyContent="end" gap="small">
            <s-button variant="primary" icon="export">Enviar por WhatsApp</s-button>
          </s-stack>
        </s-stack>
      )}

      <s-stack padding="base" alignItems="center">
        <s-text>¿Tienes alguna duda? <s-link href="">Contáctanos</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
