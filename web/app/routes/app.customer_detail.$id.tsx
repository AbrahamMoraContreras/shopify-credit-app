import { useLoaderData, useNavigation } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";
import { ClientDate } from "../components/ClientDate";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const shopifyCustomerId = params.id;
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  // 1. Fetch backend customer using shopify numeric id
  const custRes = await fetch(`${BACKEND_URL}/api/customers?shopify_customer_id=${shopifyCustomerId}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  
  if (!custRes.ok) throw new Error("Error fetching customer");
  const customers = await custRes.json();
  const customer = customers.length > 0 ? customers[0] : null;

  if (!customer) throw new Error("Customer no encontrado en la base de datos interna");

  // 2. Fetch credits for this customer
  const creditsRes = await fetch(`${BACKEND_URL}/api/credits?customer_id=${customer.id}`, {
    headers: { "Authorization": `Bearer ${accessToken}` }
  });
  const credits = creditsRes.ok ? await creditsRes.json() : [];

  // 3. Fetch payments for those credits
  const paymentsPromises = credits.map((c: any) => 
    fetch(`${BACKEND_URL}/api/credits/payments/by-credit/${c.id}`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    }).then(res => res.ok ? res.json() : [])
  );
  
  const paymentsArrays = await Promise.all(paymentsPromises);
  const allPayments = paymentsArrays.flat();

  return { customer, credits, allPayments, shopifyCustomerId };
};

export default function CustomerDetail() {
  const { customer, credits, allPayments, shopifyCustomerId } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  // Unified operations list
  const operations: any[] = [];
  
  credits.forEach((c: any) => {
    operations.push({
      type: 'credit',
      id: c.id,
      date: c.created_at,
      amount: c.total_amount,
      status: c.status,
      reference: c.invoice_code || `Credito #${c.id}`,
      label: 'Crédito Solicitado',
      link: `/app/credit_detail/${c.id}`
    });
  });

  allPayments.forEach((p: any) => {
    operations.push({
      type: 'payment',
      id: p.id,
      date: p.payment_date,
      amount: p.amount,
      status: p.status,
      reference: `Pago-Credito #${p.credit_id}: ${p.reference_number || 'S/N'}`,
      label: 'Abono Registrado',
      link: `/app/payment_detail/${p.id}`
    });
  });

  // Sort by date DESC
  operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Metrics
  const totalDebt = credits
    .filter((c:any) => c.status !== 'CANCELADO' && c.status !== 'RECHAZADO')
    .reduce((sum: number, c: any) => sum + Number(c.balance || 0), 0);

  const reputationBadge = (label: string | null) => {
    const config: Record<string, { tone: string; emoji: string; text: string }> = {
      excelente: { tone: "success", emoji: "⭐", text: "Excelente" },
      buena: { tone: "info", emoji: "👍", text: "Buena" },
      regular: { tone: "attention", emoji: "⚠️", text: "Regular" },
      mala: { tone: "critical", emoji: "❌", text: "Mala" },
      sin_historial: { tone: "neutral", emoji: "—", text: "Sin historial" },
    };
    const c = config[label ?? "sin_historial"] ?? config["sin_historial"];
    return <s-badge tone={c.tone as any}>{c.emoji} {c.text}</s-badge>;
  };

  return (
    <s-page heading="Detalles del Cliente">
        <s-button slot="primary-action" href={`shopify:admin/customers/${shopifyCustomerId}`} accessibilityLabel="Ver en Shopify Administrador">
            Ver en Shopify
        </s-button>

        <s-stack gap="base">
            {/* Header Section */}
            <s-grid gridTemplateColumns="fr" alignItems="center" gap="base">
                <s-stack alignItems="center" gap="base" padding="base">
                    <s-section accessibilityLabel="Sección de detalles del cliente">
                        <s-stack alignItems="center" gap="base" padding="base">
                            <s-heading><strong>{customer.full_name}</strong></s-heading>
                            <s-text color="subdued">{customer.email || 'Sin correo registrado'}</s-text>
                            <s-divider />
                            <s-text color="subdued">ID Interno: {customer.id} | ID Shopify: {shopifyCustomerId}</s-text>
                        </s-stack>
                    </s-section>
                </s-stack>
            </s-grid>

            {/* Metrics Section */}
            <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="base">
                <s-section padding="base">
                    <s-heading>Deuda Total Pendiente</s-heading>
                    <s-box>
                        <s-text type="strong">${totalDebt.toFixed(2)}</s-text>
                    </s-box>
                </s-section>
                <s-section padding="base">
                    <s-heading>Saldo a Favor</s-heading>
                    <s-box>
                        <s-text type="strong">${Number(customer.favorable_balance || 0).toFixed(2)}</s-text>
                    </s-box>
                </s-section>
                <s-section padding="base">
                    <s-heading>Límite de Crédito</s-heading>
                    <s-box>
                        <s-text type="strong">
                           {customer.credit_limit ? `$${Number(customer.credit_limit).toFixed(2)}` : 'Ilimitado'}
                        </s-text>
                    </s-box>
                </s-section>
                <s-section padding="base">
                    <s-heading>Reputación Crediticia</s-heading>
                    <s-box>
                        {reputationBadge(customer.reputation)}
                    </s-box>
                </s-section>
            </s-grid>

            {/* Operations History Table */}
            <s-section padding="base">
                <s-heading>Historial de Operaciones Completas</s-heading>
                <s-table variant="auto">
                    <s-table-header-row>
                        <s-table-header listSlot="primary">Fecha</s-table-header>
                        <s-table-header listSlot="primary">Tipo de Operación</s-table-header>
                        <s-table-header>Referencia</s-table-header>
                        <s-table-header format="numeric">Monto</s-table-header>
                        <s-table-header listSlot="secondary">Estatus</s-table-header>
                        <s-table-header listSlot="primary">Acciones</s-table-header>
                    </s-table-header-row>
                    <s-table-body>
                        {operations.length === 0 ? (
                            <s-table-row>
                                <s-table-cell>
                                    <div style={{ textAlign: "center" }}>
                                        <s-text color="subdued">Este cliente aún no tiene operaciones consolidadas registradas.</s-text>
                                    </div>
                                </s-table-cell>
                            </s-table-row>
                        ) : (
                            operations.map((op, idx) => (
                                <s-table-row key={`${op.type}-${op.id}-${idx}`}>
                                    <s-table-cell><ClientDate dateString={op.date} /></s-table-cell>
                                    <s-table-cell>
                                        <s-badge tone={op.type === 'credit' ? 'info' : 'success'}>
                                            {op.label}
                                        </s-badge>
                                    </s-table-cell>
                                    <s-table-cell>
                                      {op.reference}
                                    </s-table-cell>
                                    <s-table-cell>${Number(op.amount).toFixed(2)}</s-table-cell>
                                    <s-table-cell>
                                        <s-badge tone={
                                            op.status === 'APROBADO' || op.status === 'PAGADO' || op.status === 'EMITIDO' ? 'success' :
                                            op.status === 'PENDIENTE' || op.status === 'EN_REVISION' || op.status === 'PENDIENTE_ACTIVACION' || op.status === 'EN_PROGRESO' ? 'warning' :
                                            op.status === 'CANCELADO' || op.status === 'RECHAZADO' || op.status === 'MORA' ? 'critical' : 'neutral'
                                        }>
                                            {op.status}
                                        </s-badge>
                                    </s-table-cell>
                                    <s-table-cell>
                                        <s-button href={op.link}>Ver Detalles</s-button>
                                    </s-table-cell>
                                </s-table-row>
                            ))
                        )}
                    </s-table-body>
                </s-table>
            </s-section>

             <s-stack padding="base" alignItems="center" gap="base">
          <s-text color="subdued">Desarrollado por Opentech LCC</s-text>
          <s-text>¿Tienes alguna duda? <s-link href="https://lccopen.tech/contact" target="_blank">Contáctanos</s-link>.</s-text>
        </s-stack>
        </s-stack>
    </s-page>
  );
}
