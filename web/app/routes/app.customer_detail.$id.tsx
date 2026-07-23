import { useLoaderData, useNavigation, useSubmit, Form, useActionData } from "react-router";
import { useState, useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";
import { ClientDate } from "../components/ClientDate";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const shopifyCustomerId = params.id;
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  const custRes = await fetch(
    `${BACKEND_URL}/api/customers?shopify_customer_id=${shopifyCustomerId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!custRes.ok) throw new Error("Error fetching customer");
  const customers = await custRes.json();
  let customer = customers.length > 0 ? customers[0] : null;

  if (!customer) {
    // Si no está en el backend, buscar en Shopify para mostrar perfil vacío
    const shopifyRes = await admin.graphql(
      `query { customer(id: "gid://shopify/Customer/${shopifyCustomerId}") { displayName email phone } }`
    );
    const shopifyData = await shopifyRes.json();
    const sc = shopifyData.data?.customer;
    
    if (!sc) {
      throw new Error("Cliente no existe ni en Shopify ni en el sistema.");
    }

    customer = {
      id: null,
      full_name: sc.displayName,
      email: sc.email,
      phone: sc.phone,
      favorable_balance: 0,
      punctuality_score: null,
      reputation: "sin_historial",
      is_virtual: true
    };
  }

  // Solo cargar créditos y pagos si el cliente existe en el backend
  let credits = [];
  let allPayments = [];
  let balanceHistory = [];

  if (customer.id) {
    const creditsRes = await fetch(
      `${BACKEND_URL}/api/credits?customer_id=${customer.id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    credits = creditsRes.ok ? await creditsRes.json() : [];

    const paymentsPromises = credits.map((c: any) =>
      fetch(`${BACKEND_URL}/api/credits/payments/by-credit/${c.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((res) => (res.ok ? res.json() : [])),
    );

    const paymentsArrays = await Promise.all(paymentsPromises);
    allPayments = paymentsArrays.flat();

    const balanceHistoryRes = await fetch(
      `${BACKEND_URL}/api/audit/customer/${customer.id}/balance-history`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    balanceHistory = balanceHistoryRes.ok ? await balanceHistoryRes.json() : [];
  }

  return { customer, credits, allPayments, shopifyCustomerId, balanceHistory };
};

export const action = async ({ request, params }: any) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) return { error: "Token no disponible" };

  const formData = await request.formData();
  const intent = formData.get("intent");
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  if (intent === "manage_balance") {
    const customerId = formData.get("customer_id");
    const amount = formData.get("amount");
    const actionType = formData.get("action_type");
    const reason = formData.get("reason");

    try {
      const res = await fetch(`${BACKEND_URL}/api/customers/${customerId}/favorable-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ amount: Number(amount), action: actionType, reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { error: err.detail || "Error al actualizar saldo" };
      }
      return { success: true };
    } catch (e) {
      return { error: "Error de conexión al actualizar saldo" };
    }
  }

  return null;
};

export default function CustomerDetail() {
  const { customer, credits, allPayments, shopifyCustomerId, balanceHistory } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const actionData = useActionData<any>();
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ amount: "", action: "ADD", reason: "" });
  const submit = useSubmit();

  const operations: any[] = [];

  credits.forEach((c: any) => {
    operations.push({
      type: "credit",
      id: c.id,
      date: c.created_at,
      amount: c.total_amount,
      status: c.status?.replace(/_/g, " "),
      reference: c.invoice_code || `Credito #${c.id}`,
      label: "Crédito Solicitado",
      link: `/app/credit_detail/${c.id}`,
    });
  });

  allPayments.forEach((p: any) => {
    operations.push({
      type: "payment",
      id: p.id,
      date: p.payment_date,
      amount: p.amount,
      status: p.status?.replace(/_/g, " "),
      reference: `Pago-Credito #${p.credit_id}: ${p.reference_number || "S/N"}`,
      label: "Abono Registrado",
      link: `/app/payment_detail/${p.id}`,
      punctuality_value: p.punctuality_value,
    });
  });

  operations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const totalDebt = credits
    .filter((c: any) => c.status !== "CANCELADO" && c.status !== "RECHAZADO")
    .reduce((sum: number, c: any) => sum + Number(c.balance || 0), 0);

  // Estadísticas de créditos y pagos
  const creditsCompleted = credits.filter(
    (c: any) => c.status === "PAGADO",
  ).length;
  const creditsIncomplete = credits.filter((c: any) =>
    ["PENDIENTE_ACTIVACION", "EMITIDO", "EN_PROGRESO", "MOROSO"].includes(
      c.status,
    ),
  ).length;
  const paymentsOnTime = allPayments.filter(
    (p: any) =>
      p.status === "APROBADO" &&
      p.punctuality_value != null &&
      Number(p.punctuality_value) === 100,
  ).length;
  const paymentsLate = allPayments.filter(
    (p: any) =>
      p.status === "APROBADO" &&
      p.punctuality_value != null &&
      Number(p.punctuality_value) === 0,
  ).length;

  const reputationBadge = (label: string | null) => {
    const config: Record<
      string,
      { tone: string; emoji: string; text: string }
    > = {
      excelente: { tone: "success", emoji: "⭐", text: "Excelente" },
      buena: { tone: "info", emoji: "👍", text: "Buena" },
      regular: { tone: "attention", emoji: "⚠️", text: "Regular" },
      mala: { tone: "critical", emoji: "❌", text: "Mala" },
      sin_historial: { tone: "neutral", emoji: "—", text: "Sin historial" },
    };
    const c = config[label ?? "sin_historial"] ?? config["sin_historial"];
    return (
      <s-badge tone={c.tone as any}>
        {c.emoji} {c.text}
      </s-badge>
    );
  };

  const handleExport = (format: string) => {
    if (!format || !customer) return;

    const summaryHeader = [["Atributo", "Valor"]];
    const summaryData = [
      ["Nombre", customer.full_name || ""],
      ["Email", customer.email || "Sin correo registrado"],
      ["ID Interno", customer.id?.toString() || "N/A"],
      ["ID Shopify", shopifyCustomerId?.toString() || ""],
      ["Deuda Total Pendiente", `$${totalDebt.toFixed(2)}`],
      [
        "Saldo a Favor",
        `$${Number(customer.favorable_balance || 0).toFixed(2)}`,
      ],
      ["Reputación", customer.reputation || "sin_historial"],
    ];

    const operationsData = operations.map((op) => ({
      Fecha: new Date(op.date).toLocaleDateString(),
      "Tipo Operación": op.label,
      Referencia: op.reference,
      Monto: `$${Number(op.amount).toFixed(2)}`,
      Estatus: op.status?.replace(/_/g, " "),
    }));

    if (format === "csv" || format === "xlsx") {
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.aoa_to_sheet([
        ...summaryHeader,
        ...summaryData,
      ]);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Cliente");

      if (operationsData.length > 0) {
        const wsOperations = XLSX.utils.json_to_sheet(operationsData);
        XLSX.utils.book_append_sheet(wb, wsOperations, "Historial Operaciones");
      }

      if (format === "csv") {
        const allData = [
          ["--- Resumen Cliente ---"],
          ...summaryHeader,
          ...summaryData,
          [],
          ["--- Historial de Operaciones ---"],
          operationsData.length > 0 ? Object.keys(operationsData[0]) : [],
          ...operationsData.map(Object.values),
        ];
        const wbCsv = XLSX.utils.book_new();
        const wsCombined = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(wbCsv, wsCombined, "Export");
        XLSX.writeFile(wbCsv, `cliente_${customer.id ?? shopifyCustomerId}.csv`);
      } else {
        XLSX.writeFile(wb, `cliente_${customer.id ?? shopifyCustomerId}.xlsx`);
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`Reporte de Cliente: ${customer.full_name}`, 14, 15);

      autoTable(doc, { startY: 20, head: summaryHeader, body: summaryData });
      const currentY = (doc as any).lastAutoTable.finalY + 10;

      if (operationsData.length > 0) {
        doc.text("Historial de Operaciones Completas", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(operationsData[0])],
          body: operationsData.map(Object.values),
        });
      }

      doc.save(`cliente_${customer.id ?? shopifyCustomerId}.pdf`);
    }
  };

  return (
    <s-page heading="Detalles del Cliente" inlineSize="large">
      <s-stack
        direction="inline"
        gap="small"
        alignItems="center"
        slot="primary-action"
      >
        <s-button
          variant="secondary"
          accessibilityLabel="Opciones de exportación"
          commandFor="export-popover"
          command="--toggle"
        >
          Exportar Datos...
        </s-button>
        <s-popover id="export-popover">
          <s-stack direction="block" gap="small" padding="base">
            <s-button
              accessibilityLabel="Exportar como CSV"
              variant="tertiary"
              onClick={() => handleExport("csv")}
            >
              Exportar a CSV
            </s-button>
            <s-button
              accessibilityLabel="Exportar como Excel (XLSX)"
              variant="tertiary"
              onClick={() => handleExport("xlsx")}
            >
              Exportar a Excel (XLSX)
            </s-button>
            <s-button
              accessibilityLabel="Exportar como PDF"
              variant="tertiary"
              onClick={() => handleExport("pdf")}
            >
              Exportar a PDF
            </s-button>
          </s-stack>
        </s-popover>
        <s-button
          href={`shopify:admin/customers/${shopifyCustomerId}`}
          accessibilityLabel="Ver en Shopify Administrador"
        >
          Ver en Shopify
        </s-button>
      </s-stack>

      <s-stack gap="base">
        {customer.is_virtual && (
          <s-banner tone="info" heading="Perfil Virtual">
            <s-text>Este cliente aún no ha solicitado créditos ni realizado pagos. Su perfil está en modo virtual y se registrará formalmente al emitir su primer crédito.</s-text>
          </s-banner>
        )}
        <s-grid gridTemplateColumns="fr" alignItems="center" gap="base">
          <s-stack alignItems="center" gap="base" padding="base">
            <s-section accessibilityLabel="Sección de detalles del cliente">
              <s-stack alignItems="center" gap="base" padding="base">
                <s-heading>
                  <strong>{customer.full_name}</strong>
                </s-heading>
                <s-text color="subdued">
                  {customer.email || "Sin correo registrado"}
                </s-text>
                <s-divider />
                <s-text color="subdued">
                  ID Interno: {customer.id ?? "N/A"} | ID Shopify: {shopifyCustomerId}
                </s-text>
              </s-stack>
            </s-section>
          </s-stack>
        </s-grid>

        <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="base">
          <s-section padding="base">
            <s-heading>Deuda Total Pendiente</s-heading>
            <s-box>
              <s-text type="strong">${totalDebt.toFixed(2)}</s-text>
            </s-box>
          </s-section>
          <s-section padding="base">
            <s-heading>Saldo a Favor</s-heading>
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-box>
                <s-text type="strong" tone="success">
                  ${Number(customer.favorable_balance || 0).toFixed(2)}
                </s-text>
              </s-box>
              <s-button 
                variant="secondary" 
                onClick={() => setIsBalanceModalOpen(true)}
                accessibilityLabel="Gestionar saldo a favor"
                disabled={customer.is_virtual}
              >
                Gestionar Saldo
              </s-button>
            </s-stack>
          </s-section>
          <s-section padding="base">
            <s-heading>Reputación Crediticia</s-heading>
            <s-box>{reputationBadge(customer.reputation)}</s-box>
          </s-section>
          <s-section padding="base">
            <s-heading>Total Pagado (Histórico)</s-heading>
            <s-box>
              <s-text type="strong" tone="success">
                ${allPayments
                  .filter((p: any) => p.status === "APROBADO")
                  .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
                  .toFixed(2)}
              </s-text>
            </s-box>
          </s-section>
        </s-grid>

        <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="base">
          <s-section padding="base">
            <s-heading>Créditos Completados</s-heading>
            <s-box>
              {creditsCompleted > 0 ? (
                <s-badge tone="success">{creditsCompleted}</s-badge>
              ) : (
                <s-text type="strong" color="subdued">0</s-text>
              )}
            </s-box>
          </s-section>
          <s-section padding="base">
            <s-heading>Créditos Pendientes</s-heading>
            <s-box>
              {creditsIncomplete > 0 ? (
                <s-badge tone="warning">{creditsIncomplete}</s-badge>
              ) : (
                <s-text type="strong" color="subdued">0</s-text>
              )}
            </s-box>
          </s-section>
          <s-section padding="base">
            <s-heading>Cobros a Tiempo</s-heading>
            <s-box>
              {paymentsOnTime > 0 ? (
                <s-badge tone="success">{paymentsOnTime}</s-badge>
              ) : (
                <s-text type="strong" color="subdued">0</s-text>
              )}
            </s-box>
          </s-section>
          <s-section padding="base">
            <s-heading>Cobros Tardíos</s-heading>
            <s-box>
              {paymentsLate > 0 ? (
                <s-badge tone="critical">{paymentsLate}</s-badge>
              ) : (
                <s-text type="strong" color="subdued">0</s-text>
              )}
            </s-box>
          </s-section>
        </s-grid>

        <s-section padding="base">
          <s-heading>Historial de Operaciones Completas</s-heading>
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header listSlot="primary">Fecha</s-table-header>
              <s-table-header listSlot="primary">
                Tipo de Operación
              </s-table-header>
              <s-table-header>Referencia</s-table-header>
              <s-table-header format="numeric">Monto</s-table-header>
              <s-table-header>Puntualidad</s-table-header>
              <s-table-header listSlot="secondary">Estatus</s-table-header>
              <s-table-header listSlot="primary">Acciones</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {operations.length === 0 ? (
                <s-table-row>
                  <s-table-cell>
                    <div style={{ textAlign: "center" }}>
                      <s-text color="subdued">
                        Este cliente aún no tiene operaciones consolidadas
                        registradas.
                      </s-text>
                    </div>
                  </s-table-cell>
                </s-table-row>
              ) : (
                operations.map((op, idx) => (
                  <s-table-row key={`${op.type}-${op.id}-${idx}`}>
                    <s-table-cell>
                      <ClientDate dateString={op.date} />
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge tone={op.type === "credit" ? "info" : "success"}>
                        {op.label}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>{op.reference}</s-table-cell>
                    <s-table-cell>${Number(op.amount).toFixed(2)}</s-table-cell>
                    <s-table-cell>
                      {op.type === "payment" ? (
                        op.punctuality_value !== null && op.punctuality_value !== undefined ? (
                          Number(op.punctuality_value) === 100 ? (
                            <s-badge tone="success">A Tiempo</s-badge>
                          ) : (
                            <s-badge tone="critical">Tarde</s-badge>
                          )
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )
                      ) : (
                        <s-text color="subdued">N/A</s-text>
                      )}
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge
                        tone={
                          op.status === "APROBADO" ||
                          op.status === "PAGADO" ||
                          op.status === "EMITIDO"
                            ? "success"
                            : op.status === "PENDIENTE" ||
                                op.status === "EN_REVISION" ||
                                op.status === "PENDIENTE_ACTIVACION" ||
                                op.status === "EN_PROGRESO"
                              ? "warning"
                              : op.status === "CANCELADO" ||
                                  op.status === "RECHAZADO" ||
                                  op.status === "MORA"
                                ? "critical"
                                : "neutral"
                        }
                      >
                        {op.status?.replace(/_/g, " ")}
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

        {/* Historial de Saldo a Favor */}
        <s-section padding="base">
          <s-heading>Historial de Saldo a Favor</s-heading>
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header listSlot="primary">Fecha</s-table-header>
              <s-table-header listSlot="primary">Acción</s-table-header>
              <s-table-header format="numeric">Monto</s-table-header>
              <s-table-header>Razón</s-table-header>
              <s-table-header format="numeric">Saldo Resultante</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {balanceHistory && balanceHistory.length === 0 ? (
                <s-table-row>
                  <s-table-cell>
                    <div style={{ textAlign: "center" }}>
                      <s-text color="subdued">No hay movimientos de saldo a favor.</s-text>
                    </div>
                  </s-table-cell>
                </s-table-row>
              ) : (
                balanceHistory && balanceHistory.map((log: any) => (
                  <s-table-row key={log.id}>
                    <s-table-cell><ClientDate dateString={log.timestamp} format="datetime" /></s-table-cell>
                    <s-table-cell>
                      {log.changes?.action === "ADD" ? (
                        <s-badge tone="success">Nota de Crédito (+)</s-badge>
                      ) : (
                        <s-badge tone="warning">Retiro de Fondos (-)</s-badge>
                      )}
                    </s-table-cell>
                    <s-table-cell>${Number(log.changes?.amount_changed).toFixed(2)}</s-table-cell>
                    <s-table-cell>{log.changes?.reason}</s-table-cell>
                    <s-table-cell>${Number(log.changes?.new_balance).toFixed(2)}</s-table-cell>
                  </s-table-row>
                ))
              )}
            </s-table-body>
          </s-table>
        </s-section>

        {isBalanceModalOpen && (
          <s-modal
            open={isBalanceModalOpen}
            onClose={() => setIsBalanceModalOpen(false)}
            title="Gestionar Saldo a Favor"
          >
            <s-box padding="base">
              {actionData?.error && (
                <s-banner tone="critical" heading="Error">
                  <s-text>{actionData.error}</s-text>
                </s-banner>
              )}
              {actionData?.success && (
                <s-banner tone="success" heading="Éxito">
                  <s-text>Saldo actualizado correctamente.</s-text>
                </s-banner>
              )}
              <s-stack gap="base" direction="block">
                <s-select
                  label="Tipo de Operación"
                  value={balanceForm.action}
                  onChange={(e: any) => setBalanceForm((p) => ({ ...p, action: e.target.value }))}
                >
                  <s-option value="ADD">Emitir Nota de Crédito (+ Aumentar saldo)</s-option>
                  <s-option value="SUBTRACT">Retirar Fondos (- Devolver efectivo al cliente)</s-option>
                </s-select>

                <s-number-field
                  label="Monto (USD)"
                  value={balanceForm.amount}
                  onChange={(e: any) => setBalanceForm((p) => ({ ...p, amount: e.target.value }))}
                />

                <s-text-area
                  label="Motivo o Referencia"
                  value={balanceForm.reason}
                  onChange={(e: any) => setBalanceForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Ej: Devolución de mercancía..."
                  rows={2}
                />
                
                <s-stack direction="inline" gap="small" justifyContent="end">
                  <s-button variant="secondary" onClick={() => setIsBalanceModalOpen(false)}>
                    Cerrar
                  </s-button>
                  <s-button
                    variant="primary"
                    disabled={!balanceForm.amount || !balanceForm.reason}
                    onClick={() => {
                      const formData = new FormData();
                      formData.append("intent", "manage_balance");
                      formData.append("customer_id", String(customer.id));
                      formData.append("amount", balanceForm.amount);
                      formData.append("action_type", balanceForm.action);
                      formData.append("reason", balanceForm.reason);
                      submit(formData, { method: "post" });
                      setBalanceForm({ amount: "", action: "ADD", reason: "" });
                    }}
                  >
                    Confirmar
                  </s-button>
                </s-stack>
              </s-stack>
            </s-box>
          </s-modal>
        )}

        <s-stack padding="base" alignItems="center" gap="base">
          <s-text color="subdued">Desarrollado por Opentech LCC</s-text>
          <s-text>
            ¿Tienes alguna duda?{" "}
            <s-link href="https://lccopen.tech/contact" target="_blank">
              Contáctanos
            </s-link>
            .
          </s-text>
        </s-stack>
      </s-stack>
    </s-page>
  );
}

import { useRouteError, isRouteErrorResponse } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();
  const errorMessage = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Ocurrió un error inesperado al conectar con el servidor.";

  return (
    <s-page heading="Error" inlineSize="large">
      <s-section padding="base">
        <s-banner tone="critical" heading="Ha ocurrido un problema al cargar el perfil">
          <p>{errorMessage}</p>
        </s-banner>
      </s-section>
    </s-page>
  );
}
