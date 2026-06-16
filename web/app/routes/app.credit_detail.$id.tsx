import {
  useParams,
  useSubmit,
  useNavigation,
  useActionData,
  useLoaderData,
  redirect,
} from "react-router";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ExternalIcon,
  AlertCircleIcon,
  EditIcon,
  CheckCircleIcon,
} from "@shopify/polaris-icons";
import { ClientDate } from "../components/ClientDate";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";

const cleanPhoneForWhatsApp = (phone: string): string => {
  return phone.replace(/[^0-9]/g, "");
};

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="16" height="16" fill="#25D366" style={{ verticalAlign: "middle" }}>
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);
import type { Credit, PaymentResponse } from "web/app/types/credit";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");
  const { id } = params;

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const [creditRes, paymentsRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/credits/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`${BACKEND_URL}/api/credits/payments/by-credit/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  if (!creditRes.ok) throw new Error("Credit no encontrado");
  const credit: Credit = await creditRes.json();
  const payments: PaymentResponse[] = paymentsRes.ok
    ? await paymentsRes.json()
    : [];
  return { credit, payments };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const { id } = params;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  if (intent === "approve") {
    const concept = formData.get("concept");
    try {
      const response = await fetch(`${BACKEND_URL}/api/credits/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: "EMITIDO", concept }),
      });
      if (!response.ok) {
        const error = await response.json();
        return { error: error.detail || "Error al aprobar el crédito" };
      }
      return { success: true };
    } catch {
      return { error: "Error de conexión" };
    }
  }

  if (intent === "cancel") {
    try {
      const response = await fetch(`${BACKEND_URL}/api/credits/${id}/cancel`, {
        method: "PUT",
        headers: authHeaders, // USE authHeaders here instead of just Authorization
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response on cancel:", errorText);
        try {
            const errorJson = JSON.parse(errorText);
            return { error: errorJson.detail || "Error al cancelar el crédito" };
        } catch(e) {
            return { error: `Error interno del servidor: ${errorText.substring(0, 50)}...` };
        }
      }
      return redirect(`/app/credit_detail/${id}`);
    } catch (e: any) {
      console.error("Fetch exception on cancel:", e);
      return { error: `Error de conexión: ${e.message}` };
    }
  }

  if (intent === "send_reminder") {
    const body = {
      credit_id: Number(id),
      installment_id: formData.get("installment_id")
        ? Number(formData.get("installment_id"))
        : null,
      amount: Number(formData.get("amount")),
      customer_email: formData.get("customer_email"),
    };
    try {
      const res = await fetch(`${BACKEND_URL}/api/payments/payment-tokens`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok)
        return {
          error: "No se pudo enviar",
          key: formData.get("key") as string,
        };
      return { success: true, key: formData.get("key") as string, url: data.url };
    } catch {
      return { error: "Error", key: formData.get("key") as string };
    }
  }

  return null;
};

export default function CreditDetail() {
  const { credit, payments } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{
    error?: string;
    success?: boolean;
    key?: string;
    url?: string;
  }>();
  const isSubmitting = navigation.state === "submitting";
  const submittingKey = navigation.formData?.get("key") as string | undefined;

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editConcept, setEditConcept] = useState(credit.concept || "");
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [urlsMap, setUrlsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (
      actionData?.success &&
      navigation.formData?.get("intent") === "approve"
    ) {
      setIsEditing(false);
    }
    if (actionData?.key) {
      setStatusMap((prev) => ({
        ...prev,
        [actionData.key as string]: actionData.success ? "sent" : "error",
      }));
      if (actionData.url) {
        setUrlsMap((prev) => ({
          ...prev,
          [actionData.key as string]: actionData.url,
        }));
      }
    }
  }, [actionData, navigation.formData]);

  const handleApprove = () => {
    submit({ intent: "approve", concept: editConcept }, { method: "post" });
  };

  const handleCancel = () => {
    if (
      !confirm(
        "¿Seguro que deseas cancelar este crédito? Los pagos pendientes ya no serán esperados.",
      )
    )
      return;
    submit({ intent: "cancel" }, { method: "post" });
  };

  const approvedPayments = payments.filter((p: any) => p.status === "APROBADO");
  const lastPayment = approvedPayments.length > 0 ? approvedPayments[0] : null;
  const lastPaymentAmount = lastPayment ? Number(lastPayment.amount) : 0;

  const totalPaid = approvedPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const remainingDebt = Number(credit?.total_amount ?? 0) - totalPaid;

  const handleSendReminder = (
    installmentId: number | null,
    expectedAmount: number,
  ) => {
    let email = credit?.customer?.email;

    if (!email) {
      const promptEmail = window.prompt(
        "El cliente no tiene email registrado. Por favor, ingréselo para enviar el recordatorio:",
      );
      if (!promptEmail || !promptEmail.includes("@")) {
        alert("Email no válido operacion cancelada.");
        return;
      }
      email = promptEmail;
    }

    const key = installmentId !== null ? installmentId.toString() : "fiado";
    submit(
      {
        intent: "send_reminder",
        installment_id: installmentId ? installmentId.toString() : "",
        amount: expectedAmount.toString(),
        customer_email: email,
        key,
      },
      { method: "post" },
    );
  };

  const handleExport = (format: string) => {
    if (!format || !credit) return;

    const summaryHeader = [["Atributo", "Valor"]];
    const summaryData = [
      ["ID Crédito", credit.id?.toString() || ""],
      ["Cliente", credit.customer?.full_name || ""],
      ["Email", credit.customer?.email || ""],
      ["Estado", credit.status?.replace(/_/g, " ") || ""],
      ["Monto Total Crédito", `$${Number(credit.total_amount).toFixed(2)}`],
      ["Último Monto Pagado", `$${lastPaymentAmount.toFixed(2)}`],
      ["Deuda Total Restante", `$${remainingDebt.toFixed(2)}`],
      [
        "Fecha Emisión",
        credit.created_at
          ? new Date(credit.created_at).toLocaleDateString()
          : "",
      ],
    ];

    const installmentsData = (credit.installments || []).map((i) => ({
      Vencimiento: new Date(i.due_date).toLocaleDateString(),
      "Cuota Nro": i.number.toString(),
      "Monto Esperado": `$${Number(i.amount).toFixed(2)}`,
      Estado: i.status?.replace(/_/g, " "),
    }));

    const paymentsData = payments.map((p) => ({
      Fecha: new Date(p.payment_date).toLocaleDateString(),
      Referencia: p.reference_number || "N/A",
      "Monto Abonado": `$${Number(p.amount).toFixed(2)}`,
      Estatus: p.status?.replace(/_/g, " "),
    }));

    const productsData = (credit.items || []).map((i) => ({
      "Codigo de Producto":
        i.product_code || i.product_id?.split("/").pop() || "N/A",
      Producto: i.product_name,
      Total: `$${Number(i.total_price || 0).toFixed(2)}`,
    }));

    if (format === "csv" || format === "xlsx") {
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.aoa_to_sheet([
        ...summaryHeader,
        ...summaryData,
      ]);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

      if (installmentsData.length > 0) {
        const wsInstallments = XLSX.utils.json_to_sheet(installmentsData);
        XLSX.utils.book_append_sheet(wb, wsInstallments, "Cuotas");
      }
      if (paymentsData.length > 0) {
        const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
        XLSX.utils.book_append_sheet(wb, wsPayments, "Abonos");
      }
      if (productsData.length > 0) {
        const wsProducts = XLSX.utils.json_to_sheet(productsData);
        XLSX.utils.book_append_sheet(wb, wsProducts, "Productos");
      }

      if (format === "csv") {
        const allData = [
          ["--- Resumen ---"],
          ...summaryHeader,
          ...summaryData,
          [],
          ["--- Cuotas ---"],
          installmentsData.length > 0 ? Object.keys(installmentsData[0]) : [],
          ...installmentsData.map(Object.values),
          [],
          ["--- Abonos ---"],
          paymentsData.length > 0 ? Object.keys(paymentsData[0]) : [],
          ...paymentsData.map(Object.values),
          [],
          ["--- Productos ---"],
          productsData.length > 0 ? Object.keys(productsData[0]) : [],
          ...productsData.map(Object.values),
        ];
        const wbCsv = XLSX.utils.book_new();
        const wsCombined = XLSX.utils.aoa_to_sheet(allData);
        XLSX.utils.book_append_sheet(wbCsv, wsCombined, "Export");
        XLSX.writeFile(wbCsv, `credito_${credit.id}.csv`);
      } else {
        XLSX.writeFile(wb, `credito_${credit.id}.xlsx`);
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text(`Detalles de Crédito #${credit.id}`, 14, 15);

      autoTable(doc, { startY: 20, head: summaryHeader, body: summaryData });
      let currentY = (doc as any).lastAutoTable.finalY + 10;

      if (installmentsData.length > 0) {
        doc.text("Cuotas / Pagos Esperados", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(installmentsData[0])],
          body: installmentsData.map(Object.values),
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      if (paymentsData.length > 0) {
        doc.text("Historial de Abonos", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(paymentsData[0])],
          body: paymentsData.map(Object.values),
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      if (productsData.length > 0) {
        doc.text("Productos Vinculados", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [Object.keys(productsData[0])],
          body: productsData.map(Object.values),
        });
      }

      doc.save(`credito_${credit.id}.pdf`);
    }
  };

  return (
    <s-page>
      <ui-title-bar title={`Detalles de Crédito #${credit.id}`}>
        <button variant="breadcrumb" onClick={() => window.history.back()}>
          Créditos
        </button>
      </ui-title-bar>

      <s-box paddingBlockEnd="base">
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-stack direction="block" gap="none">
            <s-heading level="1">Detalles de Crédito #{credit.id}</s-heading>
            <s-text color="subdued">Visualiza la información completa de este crédito</s-text>
          </s-stack>
          <s-stack direction="inline" gap="small">
            <s-button
              variant="secondary"
              accessibilityLabel="Opciones de exportación"
              commandFor="export-popover"
              command="--toggle"
            >
              Exportar
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
                  accessibilityLabel="Exportar como XLSX"
                  variant="tertiary"
                  onClick={() => handleExport("xlsx")}
                >
                  Exportar a XLSX
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
              variant="primary"
              href="/app/registre_payment"
              accessibilityLabel="Registrar un nuevo pago"
            >
              Registrar Pago
            </s-button>
            {credit.status !== "CANCELADO" &&
              credit.status !== "PAGADO" &&
              credit.status !== "PENDIENTE_ACTIVACION" && (
                <s-button
                  variant="primary"
                  tone="critical"
                  onClick={handleCancel}
                  accessibilityLabel="Cancelar este crédito"
                >
                  Cancelar Crédito
                </s-button>
              )}
          </s-stack>
        </s-stack>
      </s-box>

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
                  <s-heading>
                    <strong>Detalles de orden</strong>
                  </s-heading>
                  <s-text>
                    {credit.customer?.full_name ||
                      "Error al obtener nombre de cliente"}
                  </s-text>
                  <s-section>
                    <s-text>
                      {credit.customer?.email ||
                        "Error al obtener correo de cliente"}
                    </s-text>
                  </s-section>
                  <s-text color="subdued">
                    ID: {credit.invoice_code || credit.id}
                  </s-text>
                </s-stack>
              </s-section>
              <s-badge
                tone={
                  credit.status === "EMITIDO"
                    ? "neutral"
                    : credit.status === "PENDIENTE_ACTIVACION"
                      ? "warning"
                      : credit.status === "EN_PROGRESO"
                        ? "info"
                        : credit.status === "PAGADO"
                          ? "success"
                          : "info"
                }
              >
                {credit.status}
              </s-badge>
            </s-stack>
            <s-stack alignItems="end">
              {credit.status === "PENDIENTE_ACTIVACION" && (
                <s-box paddingBlockStart="base">
                  <s-stack gap="base">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          style={{
                            padding: "8px",
                            borderRadius: "4px",
                            border: "1px solid #c9cccf",
                            width: "200px",
                          }}
                          value={editConcept || ""}
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

            </s-stack>
          </s-grid>

          {/* Summary Sections */}
          <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="base">
            <s-section padding="base">
              <s-heading>Último Monto Pagado</s-heading>
              <s-box>
                <s-text type="strong">${lastPaymentAmount.toFixed(2)}</s-text>
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
                <s-text type="strong">${remainingDebt.toFixed(2)}</s-text>
              </s-box>
            </s-section>
          </s-grid>

          {/* Pagos Pendientes / Cuotas Section */}
          <s-section padding="base">
            <s-heading>Pagos Pendientes / Cuotas</s-heading>
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Vencimiento</s-table-header>
                <s-table-header format="numeric">Cuota Nro</s-table-header>
                <s-table-header format="numeric">Monto Esperado</s-table-header>
                <s-table-header listSlot="primary">Estado</s-table-header>
                <s-table-header listSlot="primary">Acciones</s-table-header>
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
                            <s-table-cell>
                              <ClientDate dateString={inst.due_date} />
                            </s-table-cell>
                            <s-table-cell>
                              {inst.number} de {credit.installments_count}
                            </s-table-cell>
                            <s-table-cell>
                              ${Number(inst.amount).toFixed(2)}
                            </s-table-cell>
                            <s-table-cell>
                              <s-badge
                                tone={
                                  inst.status === "PENDIENTE"
                                    ? "info"
                                    : inst.status === "VENCIDO"
                                      ? "critical"
                                      : "success"
                                }
                              >
                                {inst.status?.replace(/_/g, " ")}
                              </s-badge>
                            </s-table-cell>
                            <s-table-cell>
                              {inst.status !== "PAGADA" ? (
                                <s-button-group>
                                  <s-button
                                    variant="secondary"
                                    onClick={() =>
                                      handleSendReminder(
                                        inst.id,
                                        Number(inst.amount),
                                      )
                                    }
                                    disabled={
                                      submittingKey === keystr || inst.status === "EN_REVISION" || statusMap[keystr] === "sent" || undefined
                                    }
                                    tone={
                                      statusMap[keystr] === "error"
                                        ? "critical"
                                        : statusMap[keystr] === "sent"
                                          ? "auto"
                                          : undefined
                                    }
                                    accessibilityLabel="Enviar recordatorio de cuota"
                                  >
                                    {submittingKey === keystr
                                      ? "Enviando..."
                                      : statusMap[keystr] === "sent"
                                        ? "✓ Enviado"
                                        : statusMap[keystr] === "error"
                                          ? "✕ Error"
                                          : "Enviar Recordatorio"}
                                  </s-button>
                                  {credit.customer?.phone && (
                                    <s-button
                                      variant="secondary"
                                      onClick={() => {
                                        if (!urlsMap[keystr]) {
                                          alert("Por favor, haga clic primero en 'Enviar Recordatorio' para generar el link de pago único.");
                                          return;
                                        }
                                        const phone = cleanPhoneForWhatsApp(credit.customer!.phone!);
                                        let msg = `Hola ${credit.customer!.full_name}, le recordamos que tiene un pago pendiente de $${Number(inst.amount).toFixed(2)} correspondiente al Credito #${credit.id} (Cuota #${inst.number}). Por favor, realice su pago a la brevedad posible.`;
                                        
                                        if (urlsMap[keystr]) {
                                          msg += `\n\nPuede confirmar y pagar su deuda directamente en el siguiente enlace: ${urlsMap[keystr]}`;
                                        }
                                        
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                                      }}
                                      accessibilityLabel="Enviar recordatorio por WhatsApp"
                                      tone={urlsMap[keystr] ? "success" : undefined}
                                    >
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                        <WhatsAppIcon /> WhatsApp
                                      </span>
                                    </s-button>
                                  )}
                                  {statusMap[keystr] === "sent" && (
                                    <s-button
                                      variant="secondary"
                                      icon="undo"
                                      onClick={() => setStatusMap(prev => ({...prev, [keystr]: "idle"}))}
                                      accessibilityLabel="Restablecer botón"
                                    />
                                  )}
                                </s-button-group>
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
                        <div style={{ textAlign: "center" }}>
                          <s-text color="subdued">
                            No hay información de cuotas disponible
                          </s-text>
                        </div>
                      </s-table-cell>
                    </s-table-row>
                  )
                ) : // FIADO (No installments)
                credit.balance > 0 ? (
                  <s-table-row>
                    <s-table-cell>Fiado (sin cuotas)</s-table-cell>
                    <s-table-cell>Total (Fiado)</s-table-cell>
                    <s-table-cell>${remainingDebt.toFixed(2)}</s-table-cell>
                    <s-table-cell>
                      <s-badge tone="info">PENDIENTE</s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      <s-button-group>
                        <s-button
                          variant="secondary"
                          onClick={() => handleSendReminder(null, remainingDebt)}
                          disabled={submittingKey === "fiado" || payments.some((p: any) => p.status === "EN_REVISION") || statusMap["fiado"] === "sent" || undefined}
                          tone={
                            statusMap["fiado"] === "error"
                              ? "critical"
                              : statusMap["fiado"] === "sent"
                                ? "auto"
                                : undefined
                          }
                          accessibilityLabel="Enviar recordatorio de deuda"
                        >
                          {submittingKey === "fiado"
                            ? "Enviando..."
                            : statusMap["fiado"] === "sent"
                              ? "✓ Enviado"
                              : statusMap["fiado"] === "error"
                                ? "✕ Error"
                                : "Enviar Recordatorio"}
                        </s-button>
                        {credit.customer?.phone && (
                          <s-button
                            variant="secondary"
                            onClick={() => {
                              if (!urlsMap["fiado"]) {
                                alert("Por favor, haga clic primero en 'Enviar Recordatorio' para generar el link de pago único.");
                                return;
                              }
                              const phone = cleanPhoneForWhatsApp(credit.customer!.phone!);
                              let msg = `Hola ${credit.customer!.full_name}, le recordamos que tiene un pago pendiente de $${remainingDebt.toFixed(2)} correspondiente al Credito #${credit.id} (Fiado). Por favor, realice su pago a la brevedad posible.`;
                              
                              if (urlsMap["fiado"]) {
                                msg += `\n\nPuede confirmar y pagar su deuda directamente en el siguiente enlace: ${urlsMap["fiado"]}`;
                              }
                              
                              window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                            }}
                            accessibilityLabel="Enviar recordatorio por WhatsApp"
                            tone={urlsMap["fiado"] ? "success" : undefined}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <WhatsAppIcon /> WhatsApp
                            </span>
                          </s-button>
                        )}
                        {statusMap["fiado"] === "sent" && (
                          <s-button
                            variant="secondary"
                            icon="undo"
                            onClick={() => setStatusMap(prev => ({...prev, "fiado": "idle"}))}
                            accessibilityLabel="Restablecer botón"
                          />
                        )}
                      </s-button-group>
                    </s-table-cell>
                  </s-table-row>
                ) : (
                  <s-table-row>
                    <s-table-cell>
                      <div style={{ textAlign: "center" }}>
                        <s-text color="subdued">
                          La deuda está saldada o no tiene balance restante.
                        </s-text>
                      </div>
                    </s-table-cell>
                  </s-table-row>
                )}
              </s-table-body>
            </s-table>
          </s-section>

          {/* Historial de Abonos Section */}
          <s-section padding="base">
            <s-heading>Historial de Abonos</s-heading>
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Fecha</s-table-header>
                <s-table-header listSlot="primary">
                  Numero de referencia
                </s-table-header>
                <s-table-header format="numeric">Monto Abonado</s-table-header>
                <s-table-header listSlot="primary">Estatus</s-table-header>
                <s-table-header listSlot="primary">
                  Detalles de Pago
                </s-table-header>
              </s-table-header-row>
              <s-table-body>
                {payments.length === 0 ? (
                  <s-table-row>
                    <s-table-cell>
                      <div style={{ textAlign: "center" }}>
                        <s-text color="subdued">
                          Sin abonos registrados ni en revisión
                        </s-text>
                      </div>
                    </s-table-cell>
                  </s-table-row>
                ) : (
                  payments
                    .filter((p) => !p.reference_number?.startsWith("INTENT-")) // Hide intent records from history
                    .map((p) => (
                      <s-table-row key={p.id}>
                        <s-table-cell>
                          <ClientDate dateString={p.payment_date} />
                        </s-table-cell>
                        <s-table-cell>
                          {p.reference_number || "N/A"}
                        </s-table-cell>
                        <s-table-cell>
                          ${Number(p.amount).toFixed(2)}
                        </s-table-cell>
                        <s-table-cell>
                          <s-badge
                            tone={
                              p.status === "APROBADO"
                                ? "success"
                                : p.status === "EN_REVISION"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {p.status?.replace(/_/g, " ")}
                          </s-badge>
                        </s-table-cell>
                        <s-table-cell>
                          <s-link href={`/app/payment_detail/${p.id}`}>
                            Ver Pago
                          </s-link>
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
                <s-table-header listSlot="primary">
                  Codigo de Producto
                </s-table-header>
                <s-table-header listSlot="primary">Fecha</s-table-header>
                <s-table-header listSlot="primary">Productos</s-table-header>
                <s-table-header format="numeric">Monto</s-table-header>
                <s-table-header listSlot="primary">
                  Metodo de Pago
                </s-table-header>
              </s-table-header-row>
              <s-table-body>
                {!credit.items || credit.items.length === 0 ? (
                  <s-table-row>
                    <s-table-cell>
                      <div style={{ textAlign: "center" }}>
                        <s-text color="subdued">
                          No hay productos vinculados
                        </s-text>
                      </div>
                    </s-table-cell>
                  </s-table-row>
                ) : (
                  credit.items.map((item, idx) => (
                    <s-table-row key={idx}>
                      <s-table-cell>
                        {item.product_code ||
                          item.product_id?.split("/").pop() ||
                          "N/A"}
                      </s-table-cell>
                      <s-table-cell>
                        <ClientDate dateString={credit.created_at} />
                      </s-table-cell>
                      <s-table-cell>{item.product_name}</s-table-cell>
                      <s-table-cell>
                        ${Number(item.total_price).toFixed(2)}
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge
                          tone={
                            credit.status === "PAGADO" ? "success" : "warning"
                          }
                        >
                          {credit.status === "PAGADO" ? "Realizado" : "Crédito"}
                        </s-badge>
                      </s-table-cell>
                    </s-table-row>
                  ))
                )}
              </s-table-body>
            </s-table>
          </s-section>
        </s-stack>
      )}

      <s-box paddingBlockStart="large" paddingBlockEnd="base">
        <s-divider />
        <s-box paddingBlockStart="base">
          <s-stack direction="inline" justifyContent="space-between" alignItems="center">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-text color="subdued">Desarrollado por Opentech LCC</s-text>
              <s-text color="subdued">•</s-text>
              <s-text>
                ¿Tienes alguna duda?{" "}
                <s-link href="https://lccopen.tech/contact" target="_blank">
                  Contáctanos
                </s-link>
              </s-text>
            </s-stack>

          </s-stack>
        </s-box>
      </s-box>
    </s-page>
  );
}
