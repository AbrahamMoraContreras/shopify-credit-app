'use client'

import { useParams, useSubmit, useNavigation, useActionData, useLoaderData } from 'react-router';
import { useEffect, useState } from 'react';
import { ExternalIcon, AlertCircleIcon, EditIcon, CheckCircleIcon } from '@shopify/polaris-icons';
import { ClientDate } from "../components/ClientDate";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import type { Credit, PaymentResponse } from 'web/app/types/credit';
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const { id } = params;

  const [creditRes, paymentsRes] = await Promise.all([
    fetch(`http://localhost:8000/api/credits/${id}`, { headers: { "Authorization": `Bearer ${accessToken}` } }),
    fetch(`http://localhost:8000/api/credits/payments/by-credit/${id}`, { headers: { "Authorization": `Bearer ${accessToken}` } })
  ]);
  
  if (!creditRes.ok) throw new Error("Credit no encontrado");
  const credit: Credit = await creditRes.json();
  const payments: PaymentResponse[] = paymentsRes.ok ? await paymentsRes.json() : [];
  return { credit, payments };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` };

  if (intent === "approve") {
    const concept = formData.get("concept");
    try {
      const response = await fetch(`http://localhost:8000/api/credits/${id}`, {
        method: "PUT", headers: authHeaders, body: JSON.stringify({ status: "EMITIDO", concept })
      });
      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || "Error al aprobar el crédito" };
      }
      return { success: true };
    } catch { return { error: "Error de conexión" }; }
  }

  if (intent === "cancel") {
    try {
      const response = await fetch(`http://localhost:8000/api/credits/${id}/cancel`, {
        method: "PUT", headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || "Error al cancelar el crédito" };
      }
      return { success: true };
    } catch { return { error: "Error de conexión" }; }
  }

  if (intent === "send_reminder") {
    const body = {
      credit_id: Number(id),
      installment_id: formData.get("installment_id") ? Number(formData.get("installment_id")) : null,
      amount: Number(formData.get("amount")),
      customer_email: formData.get("customer_email")
    };
    try {
      const res = await fetch(`http://localhost:8000/api/payments/payment-tokens`, {
        method: "POST", headers: authHeaders, body: JSON.stringify(body)
      });
      if (!res.ok) return { error: "No se pudo enviar", key: formData.get("key") as string };
      return { success: true, key: formData.get("key") as string };
    } catch { return { error: "Error", key: formData.get("key") as string }; }
  }

  return null;
};

export default function CreditDetail() {
  const { credit, payments } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string, success?: boolean, key?: string }>();
  const isSubmitting = navigation.state === "submitting";
  const submittingKey = navigation.formData?.get("key") as string | undefined;

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editConcept, setEditConcept] = useState(credit.concept || "");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (actionData?.success && navigation.formData?.get("intent") === "approve") {
        setIsEditing(false);
    }
    if (actionData?.key) {
      setStatusMap(prev => ({ ...prev, [actionData.key as string]: actionData.success ? 'sent' : 'error' }));
      setTimeout(() => setStatusMap(prev => ({ ...prev, [actionData.key as string]: 'idle' })), 4000);
    }
  }, [actionData, navigation.formData]);

  const handleApprove = () => {
    submit({ intent: "approve", concept: editConcept }, { method: "post" });
  };

  const handleCancel = () => {
    if (!confirm('¿Seguro que deseas cancelar este crédito? Los pagos pendientes ya no serán esperados.')) return;
    submit({ intent: "cancel" }, { method: "post" });
  };

  const approvedPayments = payments.filter((p: any) => p.status === 'APROBADO');
  const lastPayment = approvedPayments.length > 0 ? approvedPayments[0] : null;
  const lastPaymentAmount = lastPayment ? Number(lastPayment.amount) : 0;
  
  const totalPaid = approvedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingDebt = Number(credit?.total_amount ?? 0) - totalPaid;

  const handleSendReminder = (installmentId: number | null, expectedAmount: number) => {
    let email = credit?.customer?.email;
    
    if (!email) {
      const promptEmail = window.prompt("El cliente no tiene email registrado. Por favor, ingréselo para enviar el recordatorio:");
      if (!promptEmail || !promptEmail.includes("@")) { alert("Email no válido operacion cancelada."); return; }
      email = promptEmail;
    }

    const key = installmentId !== null ? installmentId.toString() : "fiado";
    submit({
      intent: "send_reminder",
      installment_id: installmentId ? installmentId.toString() : "",
      amount: expectedAmount.toString(),
      customer_email: email,
      key
    }, { method: "post" });
  };

  return (
    <s-page heading="Detalles de Crédito">
      <s-button slot="primary-action" href="/app/registre_payment" accessibilityLabel="Registrar un nuevo pago">
        Registrar Pago
      </s-button>

      {actionData?.error && (
        <s-banner tone="critical" heading="Error">
            <s-text>{actionData.error}</s-text>
        </s-banner>
      )}
      {credit && (
        <s-stack gap="base">
          {/* Header Section */}
          <s-grid gridTemplateColumns="fr" alignItems="center" gap="base">
            <s-stack alignItems="center" gap="base">
                <s-section accessibilityLabel="Sección de detalles de orden">
                  <s-stack alignItems="center">
                    <s-heading><strong>Detalles de orden</strong></s-heading>
                      <s-text>{credit.customer?.full_name || 'Error al obtener nombre de cliente'}</s-text>
                        <s-section>
                          <s-text>{credit.customer?.email || 'Error al obtener correo de cliente'}</s-text>
                        </s-section>
                        <s-text color="subdued">ID: {credit.invoice_code || credit.id}</s-text>
                  </s-stack>
                </s-section>
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
                {credit.status === 'PENDIENTE_ACTIVACION' && (
                  <s-box paddingBlockStart="base">
                    <s-stack gap="base">
                      {isEditing ? (
                        <>
                          <input 
                            type="text" 
                            style={{ 
                              padding: '8px', 
                              borderRadius: '4px', 
                              border: '1px solid #c9cccf',
                              width: '200px'
                            }}
                            value={editConcept || ''} 
                            onChange={(e) => setEditConcept(e.target.value)} 
                            placeholder="Concepto (ej. Financiamiento)"
                          />
                          <s-button-group>
                            <s-button 
                                tone="auto" 
                                onClick={handleApprove}
                                disabled={isSubmitting || undefined}
                                accessibilityLabel="Guardar concepto y aprobar crédito"
                            >
                                Guardar y Aprobar
                            </s-button>
                            <s-button 
                                onClick={() => setIsEditing(false)}
                                disabled={isSubmitting || undefined}
                                accessibilityLabel="Cancelar edición de aprobación"
                            >
                                Cancelar
                            </s-button>
                          </s-button-group>
                        </>
                      ) : (
                        <s-button 
                            tone="auto" 
                            onClick={() => setIsEditing(true)}
                            disabled={isSubmitting || undefined}
                            accessibilityLabel="Iniciar aprobación de crédito"
                        >
                            Aprobar Crédito
                        </s-button>
                      )}
                    </s-stack>
                  </s-box>
                )}
                {credit.status !== 'CANCELADO' && credit.status !== 'PAGADO' && credit.status !== 'PENDIENTE_ACTIVACION' && (
                  <s-box paddingBlockStart="base">
                    <s-button 
                      variant="primary"
                      tone="critical" 
                      onClick={handleCancel}
                      accessibilityLabel="Cancelar este crédito"
                    >
                      Cancelar
                    </s-button>
                  </s-box>
                )}
            </s-stack>
          </s-grid>

          {/* Summary Sections */}
          <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="base">
            <s-section padding="base">
                <s-heading>Último Monto Pagado</s-heading>
                <s-box>
                    <s-text type="strong">
                        ${lastPaymentAmount.toFixed(2)}
                    </s-text>
                </s-box>
            </s-section>
            <s-section padding="base">
                <s-heading>Monto Total del Crédito</s-heading>
                <s-box>
                    <s-text type="strong">
                        ${Number(credit.total_amount).toFixed(2)}
                    </s-text>
                </s-box>
            </s-section>
            <s-section padding="base">
                <s-heading>Deuda Total Restante</s-heading>
                <s-box>
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
                <s-table-header listSlot='primary'>Vencimiento</s-table-header>
                <s-table-header format="numeric">Cuota Nro</s-table-header>
                <s-table-header format="numeric">Monto Esperado</s-table-header>
                <s-table-header listSlot='primary'>Estado</s-table-header>
                <s-table-header listSlot='primary'>Acciones</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {credit.installments_count > 0 ? (
                  credit.installments && credit.installments.length > 0 ? (
                    credit.installments
                      .sort((a, b) => a.number - b.number)
                      .map((inst) => {
                        const keystr = inst.id.toString();
                        return (
                          <s-table-row key={inst.id}>
                            <s-table-cell><ClientDate dateString={inst.due_date} /></s-table-cell>
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
                                  disabled={submittingKey === keystr || undefined}
                                  tone={statusMap[keystr] === 'error' ? 'critical' : (statusMap[keystr] === 'sent' ? 'auto' : undefined)}
                                  accessibilityLabel="Enviar recordatorio de cuota"
                                >
                                  {submittingKey === keystr ? 'Enviando...' : 
                                  statusMap[keystr] === 'sent' ? '✓ Enviado' : 
                                  statusMap[keystr] === 'error' ? '✕ Error' : 
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
                      <s-table-cell>
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
                          disabled={submittingKey === "fiado" || undefined}
                          tone={statusMap["fiado"] === 'error' ? 'critical' : (statusMap["fiado"] === 'sent' ? 'auto' : undefined)}
                          accessibilityLabel="Enviar recordatorio de deuda"
                        >
                          {submittingKey === "fiado" ? 'Enviando...' : 
                          statusMap["fiado"] === 'sent' ? '✓ Enviado' : 
                          statusMap["fiado"] === 'error' ? '✕ Error' : 
                          'Enviar Recordatorio'}
                        </s-button>
                      </s-table-cell>
                    </s-table-row>
                  ) : (
                    <s-table-row>
                      <s-table-cell>
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
                <s-table-header listSlot='primary'>Fecha</s-table-header>
                <s-table-header listSlot='primary'>Numero de referencia</s-table-header>
                <s-table-header format="numeric">Monto Abonado</s-table-header>
                <s-table-header listSlot='primary'>Estatus</s-table-header>
                <s-table-header listSlot='primary'>Detalles de Pago</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {payments.length === 0 ? (
                  <s-table-row>
                    <s-table-cell>
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
                      <s-table-cell><ClientDate dateString={p.payment_date} /></s-table-cell>
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
                <s-table-header listSlot='primary'>Codigo de Producto</s-table-header>
                <s-table-header listSlot='primary'>Fecha</s-table-header>
                <s-table-header listSlot='primary'>Productos</s-table-header>
                <s-table-header format="numeric">Monto</s-table-header>
                <s-table-header listSlot='primary'>Metodo de Pago</s-table-header>
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
                      <s-table-cell><ClientDate dateString={credit.created_at} /></s-table-cell>
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
            <s-button variant="primary" icon="export" accessibilityLabel="Enviar detalles por WhatsApp">Enviar por WhatsApp</s-button>
          </s-stack>
        </s-stack>
      )}

      <s-stack padding="base" alignItems="center">
        <s-text>¿Tienes alguna duda? <s-link href="">Contáctanos</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
