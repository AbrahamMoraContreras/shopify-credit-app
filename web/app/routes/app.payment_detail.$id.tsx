'use client'

import { useParams, useSubmit, useNavigation, useActionData, useLoaderData } from 'react-router';
import { useEffect } from 'react';
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { ClientDate } from "../components/ClientDate";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";

interface PaymentDetailData {
  id: number;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: string;
  payment_date: string;
  notes?: string;
  credit: {
    id: number;
    total_amount: number;
    balance: number;
    concept: string;
    customer: {
      full_name: string;
      email: string;
    };
    items: Array<{
      product_name: string;
      product_code?: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  proof?: {
    bank_name: string;
    reference_number: string;
    submitted_at: string;
    amount: number;
    notes?: string;
  };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const { id } = params;

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL}/api/payments/${id}`, {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Pago no encontrado");
  const data: PaymentDetailData = await res.json();
  return { payment: data };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "cancel") {
    try {
      const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${BACKEND_URL}/api/payments/${id}/review`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELADO" })
      });
      if (!res.ok) return { error: "Error al cancelar pago" };
      return { success: true };
    } catch { return { error: "Error de red" }; }
  }
  return null;
};

export default function PaymentDetail() {
  const { payment } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string, success?: boolean }>();

  useEffect(() => {
    if (actionData?.success) {
      alert("Pago cancelado correctamente.");
    } else if (actionData?.error) {
      alert(actionData.error);
    }
  }, [actionData]);

  const handleCancel = () => {
    if (!confirm('¿Seguro que deseas cancelar este pago? El saldo volverá a la deuda del crédito y las cuotas volverán al estado "Pendiente".')) return;
    submit({ intent: "cancel" }, { method: "post" });
  };

  return (
    <s-page heading={`Detalles de Pago #${payment.id}`}>
      <s-stack gap="base">
        {/* Basic Info & Customer */}
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          <s-section padding="base">
            <s-stack alignItems="center" gap="base">
              <s-heading><strong>Información del Pago</strong></s-heading>
            </s-stack>
            <s-stack gap="small" padding="base">
                <s-text><strong>Monto:</strong> ${Number(payment.amount).toFixed(2)}</s-text>
                <s-text><strong>Fecha:</strong> <ClientDate dateString={payment.payment_date} format="datetime" /></s-text>
                <s-text><strong>Método:</strong> {
                  payment.payment_method === 'CASH' ? 'Efectivo USD' : 
                  payment.payment_method === 'EFECTIVO' ? 'Efectivo VEF' : 
                  payment.payment_method === 'BANK' ? 'Transferencia Bancaria' :
                  payment.payment_method === 'PAGO_MOVIL' ? 'Pago Móvil' :
                  payment.payment_method
                }</s-text>
                <s-text><strong>Referencia:</strong> {payment.reference_number}</s-text>
                <s-stack direction="inline" gap="small" alignItems="center">
                    <s-text><strong>Estado:</strong></s-text>
                    <s-badge tone={payment.status === 'APROBADO' ? 'success' : (payment.status === 'RECHAZADO' ? 'critical' : 'warning')}>
                        {payment.status}
                    </s-badge>
                </s-stack>
                {payment.notes && <s-text><strong>Detalles:</strong> {payment.notes}</s-text>}
            </s-stack>
          </s-section>

          <s-section padding="base">
            <s-stack alignItems="center" gap="base">
              <s-heading><strong>Información del Cliente</strong></s-heading>
            </s-stack>
            <s-stack gap="small" padding="base">
                <s-text type="strong">{payment.credit.customer.full_name}</s-text>
                <s-text color="subdued">{payment.credit.customer.email}</s-text>
                <s-divider />
                <s-text><strong>Crédito Asociado:</strong> #{payment.credit.id}</s-text>
                <s-text><strong>Concepto:</strong> {payment.credit.concept}</s-text>
                <s-link href={`/app/credit_detail/${payment.credit.id}`}>Ver detalles del crédito</s-link>
            </s-stack>
          </s-section>
        </s-grid>
        {/* Proof Info if exists */}
        {payment.proof && (
          <s-section padding="base">
            <s-stack gap="small" padding="base">
              <s-stack alignItems="center" gap="base">
                <s-heading><strong>Comprobante Reportado (vía Web Pública)</strong></s-heading>
              </s-stack>
              <s-text color="subdued">Este pago fue reportado por el cliente con los siguientes datos:</s-text>
              <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="small">
                <s-stack>
                    <s-text color="subdued">Banco:</s-text>
                    <s-text>{payment.proof.bank_name}</s-text>
                </s-stack>
                <s-stack>
                    <s-text color="subdued">Referencia:</s-text>
                    <s-text>{payment.proof.reference_number}</s-text>
                </s-stack>
                <s-stack>
                    <s-text color="subdued">Monto Reportado:</s-text>
                    <s-text>${Number(payment.proof.amount).toFixed(2)}</s-text>
                </s-stack>
                <s-stack>
                    <s-text color="subdued">Fecha de Envío:</s-text>
                    <s-text><ClientDate dateString={payment.proof.submitted_at} format="datetime" /></s-text>
                </s-stack>
                {payment.proof.notes && (
                    <s-grid-item gridColumn="span 2">
                        <s-text color="subdued">Notas del Cliente:</s-text>
                        <s-text>{payment.proof.notes}</s-text>
                    </s-grid-item>
                )}
            </s-grid>
            </s-stack>
            
          </s-section>
        )}

        <s-section padding="base">
            <s-stack alignItems="center" gap="base">
              <s-heading>Productos en este Crédito</s-heading>
            </s-stack>
            <s-table variant="auto">
                <s-table-header-row>
                    <s-table-header>Producto</s-table-header>
                    <s-table-header format="numeric">Cantidad</s-table-header>
                    <s-table-header format="numeric">Precio Unit.</s-table-header>
                    <s-table-header format="numeric">Total</s-table-header>
                </s-table-header-row>
                <s-table-body>
                    {payment.credit.items.map((item, idx) => (
                        <s-table-row key={idx}>
                            <s-table-cell>{item.product_name}</s-table-cell>
                            <s-table-cell>{item.quantity}</s-table-cell>
                            <s-table-cell>${Number(item.unit_price).toFixed(2)}</s-table-cell>
                            <s-table-cell>${(Number(item.unit_price) * item.quantity).toFixed(2)}</s-table-cell>
                        </s-table-row>
                    ))}
                </s-table-body>
            </s-table>
        </s-section>

        <s-stack direction="inline" padding="base" justifyContent="end" gap="small">
          {payment.status !== 'CANCELADO' && payment.status !== 'RECHAZADO' && (
            <s-button 
                variant="primary"
                tone="critical" 
                onClick={handleCancel}
                accessibilityLabel="Cancelar este pago"
            >
                Cancelar
            </s-button>
          )}
          <s-button variant="primary" icon="export" accessibilityLabel="Generar recibo en PDF">Generar Recibo (PDF)</s-button>
        </s-stack>
      </s-stack>

      <s-stack padding="base" alignItems="center">
        <s-text>¿Tienes alguna duda? <s-link href="">Contáctanos</s-link>.</s-text>
      </s-stack>
    </s-page>
  );
}
