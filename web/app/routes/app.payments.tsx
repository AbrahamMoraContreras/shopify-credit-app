import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import {
  useLoaderData,
  useSubmit,
  useNavigation,
  useFetcher,
  useActionData,
} from "react-router";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";
import { ClientDate } from "../components/ClientDate";
import {
  formatBankEntityLabel,
  formatPaymentMethodLabel,
} from "../lib/paymentLabels";

interface PaymentListItem {
  id: number;
  credit_id: number;
  amount: number; // Último Abono
  payment_method: string;
  bank_name?: string;
  status: string;
  reference_number: string;
  installments_covered?: string;
  payment_date: string;
  customer_name: string;
  customer_email?: string;
  credit_total_amount: number;
  credit_balance: number;
  customer_favorable_balance: number;
  products_items: number;
  products_quantity: number;
  products_total: number;
}

interface PaymentProof {
  id: number;
  status: string;
  submitted_at: string;
  reference_number: string;
  bank_name: string;
  amount: number;
  notes: string;
  customer_email: string;
  customer_name: string;
  payment_id: number;
  credit_id: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let session;
  let admin: any;
  try {
    ({ session, admin } = await authenticate.admin(request));
  } catch (error) {
    throw error;
  }
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const limit = url.searchParams.get("limit") || "10";
  const pageSize = parseInt(limit, 10) || 10;
  const offset = (Number(page) - 1) * pageSize;

  const payment_id = url.searchParams.get("payment_id") || "";
  const credit_id = url.searchParams.get("credit_id") || "";
  const customer_name = url.searchParams.get("customer_name") || "";
  const document_type = url.searchParams.get("document_type") || "";
  const document_id = url.searchParams.get("document_id") || "";
  const payment_date = url.searchParams.get("payment_date") || "";
  const status = url.searchParams.get("status") || "";

  const params = new URLSearchParams({
    limit: pageSize.toString(),
    offset: offset.toString(),
  });
  if (payment_id) params.append("payment_id", payment_id);
  if (credit_id) params.append("credit_id", credit_id);
  if (customer_name) params.append("customer_name", customer_name);
  if (payment_date) params.append("payment_date", payment_date);
  if (status && status !== "Todos") params.append("status", status);

  if (document_type || document_id) {
    try {
      const gqlRes = await admin.graphql(`
        {
          customers(first: 250) {
            nodes {
              id
              metafields(first: 20) {
                nodes {
                  key
                  value
                }
              }
            }
          }
        }
      `);
      const { data } = await gqlRes.json();
      const shopifyCustomers = data?.customers?.nodes ?? [];
      let matchId = "-1";
      for (const c of shopifyCustomers) {
        const mfs = c.metafields?.nodes || [];
        let typeMatch = !document_type;
        let numMatch = !document_id;

        for (const mf of mfs) {
          const val = mf.value || "";
          const key = mf.key.toLowerCase();

          if (document_type && !typeMatch) {
            if (
              (key.includes("tipo") || key.includes("doc")) &&
              val.includes(document_type)
            ) {
              typeMatch = true;
            }
          }
          if (document_id && !numMatch) {
            if (
              (key === "n" ||
                key.includes("num") ||
                key.includes("n_") ||
                key.includes("doc")) &&
              val.includes(document_id)
            ) {
              numMatch = true;
            }
          }
        }

        if (typeMatch && numMatch) {
          matchId = c.id.split("/").pop() || "-1";
          break;
        }
      }
      params.append("customer_id", matchId);
    } catch (e) {
      console.error("Error fetching customers for payment filter", e);
      params.append("customer_id", "-1");
    }
  }

  const SPREADSHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQqrzXGB4grT2FhonRlj3jZVC3E9sSaZl9gkgd0nSrwtA55E_Fcy7Q3QDCO8lTMlDS_D21wgDGaXJ1x/pub?output=csv";
  let tasaBcv: number | null = null;
  let tasaFecha: string | null = null;

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const [paymentsRes, proofsRes, csvRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`${BACKEND_URL}/api/payments/payment-proofs?status=PENDIENTE`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(SPREADSHEET_CSV_URL).catch((e) => {
      console.error("[payments] Failed to fetch BCV rate:", e);
      return null;
    })
  ]);

  if (csvRes && csvRes.ok) {
    try {
      const text = await csvRes.text();
      const lines = text.trim().split("\n").filter((l) => l.trim());
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/"([\d.,]+)\s*Bs\."/);
      if (match) {
        tasaBcv = parseFloat(match[1].replace(".", "").replace(",", "."));
      }
      const dateMatch = lastLine.match(/(\d{1,2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        tasaFecha = dateMatch[1];
      }
    } catch (e) {
      console.error("[payments] Error parsing BCV rate CSV:", e);
    }
  }

  const payments = await paymentsRes.json();
  const proofs = await proofsRes.json();

  return {
    payments,
    proofs: Array.isArray(proofs)
      ? proofs.filter((p: any) => p.status === "PENDIENTE")
      : [],
    page: Number(page),
    filters: {
      payment_id,
      credit_id,
      customer_name,
      document_type,
      document_id,
      payment_date,
      status,
      limit,
    },
    tasaBcv,
    tasaFecha,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  try {
    if (intent === "batch-review") {
      const payment_ids = JSON.parse(formData.get("payment_ids") as string);
      const status = formData.get("status");
      const res = await fetch(`${BACKEND_URL}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ payment_ids, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          error: data?.detail?.message || data?.detail || "Error en revisión masiva",
          batchResult: data?.detail ?? data,
        };
      }
      if (data.failed_count > 0) {
        return {
          success: true,
          warning: `Revisados ${data.reviewed_count}, fallaron ${data.failed_count}`,
          batchResult: data,
        };
      }
      return { success: true, batchResult: data };
    } else if (intent === "batch-delete") {
      const payment_ids = JSON.parse(formData.get("payment_ids") as string);
      await fetch(`${BACKEND_URL}/api/payments/batch-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ payment_ids }),
      });
    else if (intent === "batch-cancel") {
      // Solo anula cobros no aprobados (los aprobados requieren motivo uno a uno).
      const payment_ids = JSON.parse(formData.get("payment_ids") as string);
      const res = await fetch(`${BACKEND_URL}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          payment_ids,
          status: "CANCELADO",
          notes: "Anulación masiva de cobros no aprobados",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          error: data?.detail?.message || data?.detail || "Error al anular cobros",
          batchResult: data?.detail ?? data,
        };
      }
      if (data.failed_count > 0) {
        return {
          success: true,
          warning: `Anulados ${data.reviewed_count}, fallaron ${data.failed_count}`,
          batchResult: data,
        };
      }
      return { success: true, batchResult: data };
    } else if (intent === "annul") {
      const id = formData.get("id");
      const notes = (formData.get("notes") as string) || undefined;
      const res = await fetch(`${BACKEND_URL}/api/payments/${id}/review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: "CANCELADO", notes }),
      });
      if (!res.ok) {
        let detail = await res.text();
        try {
          const parsed = JSON.parse(detail);
          detail = parsed.detail ?? detail;
        } catch {
          /* keep */
        }
        return { error: "No se pudo anular el cobro", detail: String(detail) };
      }
      return { success: true };
    } else if (intent === "revert") {
      const id = formData.get("id");
      const res = await fetch(`${BACKEND_URL}/api/payments/${id}/review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: "EN_REVISION" }),
      });
      if (!res.ok) {
        const detail = await res.text();
        return { error: "No se pudo revertir el pago", detail };
      }
    } else if (intent === "approve-proof" || intent === "reject-proof") {
      // Un solo review endpoint: el backend marca el proof REVISADO en APROBADO y RECHAZADO.
      const payment_id = Number(formData.get("payment_id"));
      const status = intent === "approve-proof" ? "APROBADO" : "RECHAZADO";
      const actionLabel = intent === "approve-proof" ? "aprobar" : "rechazar";

      const res = await fetch(
        `${BACKEND_URL}/api/payments/${payment_id}/review`,
        {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        let detail = await res.text();
        try {
          const parsed = JSON.parse(detail);
          detail = parsed.detail ?? detail;
        } catch {
          /* keep text */
        }
        return {
          error: `No se pudo ${actionLabel} el comprobante (pago #${payment_id})`,
          detail: String(detail),
        };
      }
      const payment = await res.json();
      if (payment?.status !== status) {
        return {
          error: `El pago #${payment_id} no quedó en estado ${status}`,
          detail: JSON.stringify(payment),
        };
      }
      return { success: true, proofAction: intent, payment_id };
    } else if (intent === "clear-proofs") {
      await fetch(`${BACKEND_URL}/api/payments/payment-proofs`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } else if (intent === "sync-morosity") {
      const res = await fetch(`${BACKEND_URL}/api/payments/morosity/sync`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const detail = await res.text();
        return { error: "Error sincronizando mora", detail };
      }
      const data = await res.json();
      return { success: true, morositySync: data };
    }
    return { success: true };
  } catch (e) {
    return { error: "Error en la transacción" };
  }
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function PaymentHistorial() {
  const {
    payments,
    proofs,
    page: loaderPage,
    filters,
    tasaBcv,
    tasaFecha,
  } = useLoaderData<typeof loader>() as {
    payments: PaymentListItem[];
    proofs: PaymentProof[];
    page: number;
    filters: any;
    tasaBcv: number | null;
    tasaFecha: string | null;
  };
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<{
    success?: boolean;
    error?: string;
    warning?: string;
    detail?: string;
  }>();
  const morosityFetcher = useFetcher();
  const morositySyncStarted = useRef(false);

  // Tabla primero (loader); mora por calendario en segundo plano (no bloquea el paint).
  useEffect(() => {
    if (morositySyncStarted.current) return;
    if (morosityFetcher.state !== "idle") return;
    morositySyncStarted.current = true;
    morosityFetcher.submit(
      { intent: "sync-morosity" },
      { method: "post" },
    );
  }, [morosityFetcher]);

  const loading =
    navigation.state === "loading" || navigation.state === "submitting";
  const proofsLoading = false;
  const [page, setPage] = useState(loaderPage || 1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterState, setFilterState] = useState(filters);
  const pageSize = Number(filterState.limit || "10");

  useEffect(() => {
    setSelectedIds(new Set());
  }, [payments]);

  useEffect(() => {
    if (actionData?.error) {
      console.error("[payments]", actionData.error, actionData.detail);
    }
  }, [actionData]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(payments.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSearch = () => {
    const fd = new FormData();
    Object.entries(filterState).forEach(([k, v]) => {
      if (v) fd.append(k, v as string);
    });
    fd.append("page", "1");
    submit(fd, { method: "get" });
  };

  const clearSearch = () => {
    setFilterState({
      payment_id: "",
      credit_id: "",
      customer_name: "",
      document_type: "",
      document_id: "",
      payment_date: "",
      status: "",
    });
    submit({ page: "1" }, { method: "get" });
  };

  const handleBatchReview = (status: string) => {
    if (selectedIds.size === 0) return;
    submit(
      {
        intent: "batch-review",
        payment_ids: JSON.stringify(Array.from(selectedIds)),
        status,
      },
      { method: "post" },
    );
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Está seguro de eliminar ${selectedIds.size} cobros?`)) return;
    submit(
      {
        intent: "batch-delete",
        payment_ids: JSON.stringify(Array.from(selectedIds)),
      },
      { method: "post" },
    );
  };

  const handleBatchCancel = () => {
    if (selectedIds.size === 0) return;
    const selectedPayments = payments.filter((p: any) => selectedIds.has(p.id));
    const annulable = selectedPayments.filter(
      (p: any) =>
        p.status !== "APROBADO" &&
        p.status !== "CANCELADO",
    );
    const skippedApproved = selectedPayments.filter(
      (p: any) => p.status === "APROBADO",
    ).length;

    if (annulable.length === 0) {
      alert(
        skippedApproved > 0
          ? "Los cobros aprobados no se pueden anular en lote. Ábralos uno a uno, indique un motivo y use «Anular cobro». Para corregir y revalidar, use «Revertir»."
          : "No hay cobros anulables en la selección (ya cancelados o no válidos).",
      );
      return;
    }

    const extra =
      skippedApproved > 0
        ? `\n\nNota: ${skippedApproved} cobro(s) aprobado(s) se omitirán; anúlelos individualmente con motivo.`
        : "";
    if (
      !confirm(
        `¿Anular ${annulable.length} cobro(s) no aprobado(s)? Quedarán en CANCELADO y no volverán a En revisión.${extra}`,
      )
    )
      return;

    submit(
      {
        intent: "batch-cancel",
        payment_ids: JSON.stringify(annulable.map((p: any) => p.id)),
      },
      { method: "post" },
    );
  };

  const handleRevertPayment = (id: number) => {
    if (
      !confirm(
        "¿Revertir este cobro a EN_REVISION?\nSe deshará el efecto en el crédito y podrá corregirlo/revalidarlo.",
      )
    )
      return;
    submit({ intent: "revert", id: id.toString() }, { method: "post" });
  };

  const handleAnnulPayment = (payment: { id: number; status: string }) => {
    if (payment.status === "CANCELADO") return;

    let notes = "";
    if (payment.status === "APROBADO") {
      const reason = window.prompt(
        "Motivo de anulación (obligatorio).\nEj: duplicado, error de carga, fraude.\n\nSi desea corregir y revalidar el mismo cobro, cancele y use Revertir.",
      );
      if (!reason || !reason.trim()) return;
      const typed = window.prompt(
        'Escriba ANULAR para confirmar.\nEste cobro NO volverá a En revisión.',
      );
      if (!typed || typed.trim().toUpperCase() !== "ANULAR") return;
      notes = reason.trim();
    } else if (
      !confirm(
        "¿Anular este cobro? Quedará CANCELADO y no volverá a En revisión.",
      )
    ) {
      return;
    }

    submit(
      {
        intent: "annul",
        id: payment.id.toString(),
        notes,
      },
      { method: "post" },
    );
  };

  const handleApproveProof = (proof: PaymentProof) => {
    if (
      !confirm(
        `¿Aprobar el pago de $${proof.amount} reportado por ${proof.customer_name}?`,
      )
    )
      return;
    submit(
      {
        intent: "approve-proof",
        payment_id: proof.payment_id.toString(),
        proof_id: proof.id.toString(),
      },
      { method: "post" },
    );
  };

  const handleRejectProof = (proof: PaymentProof) => {
    if (
      !confirm(
        `¿Rechazar el pago de $${proof.amount} reportado por ${proof.customer_name}?`,
      )
    )
      return;
    submit(
      {
        intent: "reject-proof",
        payment_id: proof.payment_id.toString(),
        proof_id: proof.id.toString(),
      },
      { method: "post" },
    );
  };

  const handleClearProofs = () => {
    if (
      !confirm(
        "¿Está seguro de vaciar todos los comprobantes pendientes? Esta acción no se puede deshacer.",
      )
    )
      return;
    submit({ intent: "clear-proofs" }, { method: "post" });
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "APROBADO":
        return "success";
      case "RECHAZADO":
        return "critical";
      case "EN_REVISION":
        return "warning";
      case "REGISTRADO":
        return "info";
      case "CANCELADO":
        return "critical";
      default:
        return "neutral";
    }
  };

  const hasApprovedSelected = Array.from(selectedIds).some(
    (id) => payments.find((p) => p.id === id)?.status === "APROBADO",
  );

  const handleExport = (format: string) => {
    if (!format || !payments.length) return;

    // We export the loaded payments taking care of calculated fields like Balance Restante.
    const exportData = payments.map((p) => {
      const creditTotal = Number(p.credit_total_amount);
      const abono = Number(p.amount);
      const diff = creditTotal - abono;
      const saldoRestante = Math.max(0, diff);
      const saldoAFavor = Math.max(0, abono - creditTotal);

      let cuotasCubiertas = "-";
      if (p.installments_covered) {
        cuotasCubiertas = p.installments_covered
          .split(",")
          .filter((x: string) => x.trim())
          .length.toString();
      }

      return {
        "ID Pago": p.id,
        "ID Crédito": p.credit_id,
        Fecha: new Date(p.payment_date).toLocaleDateString("es-ES"),
        Cliente: p.customer_name,
        "Total Crédito": `$${creditTotal.toFixed(2)}`,
        "Cuotas Pagadas": cuotasCubiertas,
        "Método de Pago": formatPaymentMethodLabel(p.payment_method),
        "Entidad Bancaria": formatBankEntityLabel(p.bank_name),
        Abono: `$${abono.toFixed(2)}`,
        "Balance Cliente": `$${saldoAFavor.toFixed(2)}`,
        "Balance Restante": `$${saldoRestante.toFixed(2)}`,
        Referencia: p.reference_number,
        Estado: p.status?.replace(/_/g, " "),
      };
    });

    if (format === "csv" || format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cobros");
      if (format === "csv") {
        XLSX.writeFile(wb, "cobros.csv");
      } else {
        XLSX.writeFile(wb, "cobros.xlsx");
      }
    } else if (format === "pdf") {
      const doc = new jsPDF("landscape");
      doc.text("Reporte de Cobros", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [
          [
            "ID Pago",
            "ID Crédito",
            "Fecha",
            "Cliente",
            "Método",
            "Banco",
            "Abono",
            "Estado",
          ],
        ],
        body: exportData.map((d) => [
          d["ID Pago"],
          d["ID Crédito"],
          d["Fecha"],
          d.Cliente,
          d["Método de Pago"],
          d["Entidad Bancaria"],
          d.Abono,
          d.Estado,
        ]),
        styles: { fontSize: 8 },
      });
      doc.save("cobros.pdf");
    }
  };

  return (
    <s-page heading="Historial de Cobros" inlineSize="large">
      <s-button
        slot="primary-action"
        icon="plus"
        href="/app/registre_payment"
        accessibilityLabel="Ir a registrar pago"
      >
        Registrar Cobro
      </s-button>

      {tasaBcv && (
        <s-banner tone="info" heading="Tasa de Cambio Oficial (BCV)">
          <s-text>
            La tasa de cambio actual es de <strong>Bs. {tasaBcv.toFixed(2)}</strong> por USD.
            {tasaFecha && ` Actualizada el: ${tasaFecha}.`}
          </s-text>
        </s-banner>
      )}

      {actionData?.error && (
        <s-banner tone="critical" heading="No se completó la acción">
          <s-text>{actionData.error}</s-text>
          {actionData.detail && (
            <s-text color="subdued">{String(actionData.detail)}</s-text>
          )}
        </s-banner>
      )}

      {actionData?.warning && !actionData?.error && (
        <s-banner tone="warning" heading="Revisión parcial">
          <s-text>{actionData.warning}</s-text>
        </s-banner>
      )}

      {proofs.length > 0 && (
        <s-section padding="base">
          <s-stack
            direction="inline"
            gap="base"
            justifyContent="space-between"
            alignItems="center"
          >
            <s-heading>Comprobantes por Revisar ({proofs.length})</s-heading>
            <s-button
              icon="delete"
              tone="critical"
              variant="secondary"
              onClick={handleClearProofs}
              accessibilityLabel="Vaciar todos los comprobantes"
            >
              Vaciar Todo
            </s-button>
          </s-stack>
          <s-text color="subdued">
            Reportados por clientes vía página externa.
          </s-text>
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header listSlot="primary">Fecha Envío</s-table-header>
              <s-table-header listSlot="primary">Cliente</s-table-header>
              <s-table-header listSlot="primary">Banco Origen</s-table-header>
              <s-table-header listSlot="primary">Referencia</s-table-header>
              <s-table-header listSlot="primary" format="numeric">
                Monto
              </s-table-header>
              <s-table-header listSlot="primary">Acciones</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {proofs.map((p) => (
                <s-table-row key={p.id}>
                  <s-table-cell>
                    <ClientDate dateString={p.submitted_at} format="datetime" />
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack gap="small">
                      <s-text type="strong">{p.customer_name}</s-text>
                      <s-text color="subdued">{p.customer_email}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>{p.bank_name}</s-table-cell>
                  <s-table-cell>{p.reference_number}</s-table-cell>
                  <s-table-cell>${p.amount.toFixed(2)}</s-table-cell>
                  <s-table-cell>
                    <s-button-group>
                      <s-button
                        icon="check"
                        tone="auto"
                        onClick={() => handleApproveProof(p)}
                        accessibilityLabel="Aprobar comprobante de pago"
                      >
                        Aprobar
                      </s-button>
                      <s-button
                        icon="delete"
                        tone="critical"
                        variant="secondary"
                        onClick={() => handleRejectProof(p)}
                        accessibilityLabel="Rechazar comprobante de pago"
                      >
                        Rechazar
                      </s-button>
                      <s-button
                        icon="view"
                        variant="secondary"
                        href={`/app/payment_detail/${p.payment_id}`}
                        accessibilityLabel="Ver detalles del pago"
                      >
                        Ver Pago
                      </s-button>
                      <s-button
                        icon="view"
                        variant="secondary"
                        href={`/app/credit_detail/${p.credit_id}`}
                        accessibilityLabel="Ver detalles del crédito"
                      >
                        Ver Crédito
                      </s-button>
                    </s-button-group>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      )}

      <s-divider />

      <s-section padding="base">
        <s-heading>Lista de Cobros</s-heading>

        <s-stack direction="block" gap="small" paddingBlockEnd="base">
          <s-stack
            direction="inline"
            gap="small"
            alignItems="end"
            justifyContent="space-between"
          >
            <s-stack direction="inline" gap="small">
              <s-box inlineSize="220px">
                <s-search-field
                  label="Cliente"
                  placeholder="Buscar por cliente..."
                  value={filterState.customer_name}
                  onInput={(e) =>
                    setFilterState({
                      ...filterState,
                      customer_name: e.currentTarget.value,
                    })
                  }
                />
              </s-box>

              <s-box inlineSize="120px">
                <s-select
                  label="Tipo Doc."
                  value={filterState.document_type}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      document_type: e.target?.value || "",
                    })
                  }
                >
                  <s-option value="">Todos</s-option>
                  <s-option value="V">V</s-option>
                  <s-option value="J">J</s-option>
                  <s-option value="E">E</s-option>
                </s-select>
              </s-box>

              <s-box inlineSize="160px">
                <s-number-field
                  label="N° Documento"
                  name="document_id"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={filterState.document_id}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      document_id: e.target?.value || "",
                    })
                  }
                />
              </s-box>

              <s-box inlineSize="130px">
                <s-number-field
                  label="ID Pago"
                  name="payment_id"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={filterState.payment_id}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      payment_id: e.target?.value || "",
                    })
                  }
                />
              </s-box>

              <s-box inlineSize="130px">
                <s-number-field
                  label="ID Crédito"
                  name="credit_id"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={filterState.credit_id}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      credit_id: e.target?.value || "",
                    })
                  }
                />
              </s-box>

              <s-box inlineSize="200px">
                <s-number-field
                  label="Referencia"
                  name="reference"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={filterState.reference}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      reference: e.target?.value || "",
                    })
                  }
                />
              </s-box>

              <s-box inlineSize="220px">
                <s-date-field
                  label="Fecha de pago"
                  value={filterState.payment_date}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      payment_date: e.target?.value || "",
                    })
                  }
                />
              </s-box>

              <s-box inlineSize="140px">
                <s-select
                  label="Estatus"
                  value={filterState.status || ""}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      status: e.target?.value || "",
                    })
                  }
                >
                  <s-option value="">Todos</s-option>
                  <s-option value="REGISTRADO">Registrado</s-option>
                  <s-option value="APROBADO">Aprobado</s-option>
                  <s-option value="EN_REVISION">En Revisión</s-option>
                  <s-option value="RECHAZADO">Rechazado</s-option>
                  <s-option value="CANCELADO">Cancelado</s-option>
                </s-select>
              </s-box>

              <s-box inlineSize="140px">
                <s-select
                  label="Mostrar"
                  value={filterState.limit || "10"}
                  onChange={(e: any) =>
                    setFilterState({
                      ...filterState,
                      limit: e.target?.value || "10",
                    })
                  }
                >
                  <s-option value="10">10 resultados</s-option>
                  <s-option value="20">20 resultados</s-option>
                  <s-option value="50">50 resultados</s-option>
                  <s-option value="100">100 resultados</s-option>
                </s-select>
              </s-box>
            </s-stack>
          </s-stack>

          <s-stack
            direction="inline"
            gap="small"
            justifyContent="space-between"
            alignItems="center"
          >
            <s-button variant="primary" onClick={handleSearch}>
              Buscar
            </s-button>
            <s-button variant="tertiary" tone="neutral" onClick={clearSearch}>
              Limpiar
            </s-button>

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

            <s-stack
              direction="inline"
              gap="small"
              alignItems="center"
            >
              <s-text color="subdued">{selectedIds.size} seleccionados</s-text>
                <s-button
                  tone="auto"
                  icon="check"
                  disabled={
                    selectedIds.size === 0 ||
                    hasApprovedSelected ||
                    loading ||
                    undefined
                  }
                  onClick={() => handleBatchReview("APROBADO")}
                  accessibilityLabel="Aprobar cobros seleccionados"
                >
                  Aprobar Pago
                </s-button>
                <s-button
                  tone="critical"
                  icon="delete"
                  disabled={selectedIds.size === 0 || loading || undefined}
                  onClick={() => handleBatchReview("RECHAZADO")}
                  accessibilityLabel="Rechazar cobros seleccionados"
                >
                  Rechazar Pago
                </s-button>
                <s-button
                  variant="secondary"
                  tone="critical"
                  icon="delete"
                  disabled={selectedIds.size === 0 || loading || undefined}
                  onClick={handleBatchCancel}
                  accessibilityLabel="Anular cobros no aprobados seleccionados"
                >
                  Anular cobros
                </s-button>
            </s-stack>
          </s-stack>
        </s-stack>

        <s-table
          paginate
          loading={loading || undefined}
          hasNextPage={payments.length === pageSize}
          hasPreviousPage={loaderPage > 1}
          onNextPage={() => {
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set("page", String(loaderPage + 1));
            submit(searchParams, { method: "get" });
          }}
          onPreviousPage={() => {
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set("page", String(Math.max(1, loaderPage - 1)));
            submit(searchParams, { method: "get" });
          }}
        >
          <s-table-header-row>
            <s-table-header>
              <input
                type="checkbox"
                onChange={(e) => handleSelectAll(e.target.checked)}
                checked={
                  payments.length > 0 && selectedIds.size === payments.length
                }
              />
            </s-table-header>
            <s-table-header format="numeric">ID Pago</s-table-header>
            <s-table-header format="numeric">ID Crédito</s-table-header>
            <s-table-header>Fecha Pago</s-table-header>
            <s-table-header>Cliente</s-table-header>
            <s-table-header format="numeric">Total Crédito</s-table-header>
            <s-table-header format="numeric">Cuotas Pagadas</s-table-header>
            <s-table-header>Método</s-table-header>
            <s-table-header format="numeric">Abono</s-table-header>
            <s-table-header format="numeric">Balance Cliente</s-table-header>
            <s-table-header format="numeric">
              Balance Restante Crédito
            </s-table-header>
            <s-table-header>Referencia</s-table-header>
            <s-table-header>Estado</s-table-header>
            <s-table-header>Acciones</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {payments.map((payment) => {
              const creditTotal = Number(payment.credit_total_amount);
              const abono = Number(payment.amount);
              const diff = creditTotal - abono;

              const saldoRestante = Math.max(0, diff);
              const saldoAFavor = Math.max(0, abono - creditTotal);

              const cuotasTarget = payment.installments_covered
                ? payment.installments_covered
                    .split(",")
                    .filter((x: string) => x.trim())
                    .length.toString() + " Cuota(s)"
                : "-";
              let cuotasCubiertas = "-";
              if (payment.installments_covered) {
                cuotasCubiertas =
                  payment.installments_covered
                    .split(",")
                    .filter((x: string) => x.trim())
                    .length.toString() + " Cuota(s)";
              }

              return (
                <s-table-row key={payment.id}>
                  <s-table-cell>
                    <s-checkbox
                      checked={selectedIds.has(payment.id)}
                      onChange={() => toggleSelect(payment.id)}
                    />
                  </s-table-cell>
                  <s-table-cell>{payment.id}</s-table-cell>
                  <s-table-cell>{payment.credit_id}</s-table-cell>
                  <s-table-cell>
                    <ClientDate dateString={payment.payment_date} />
                  </s-table-cell>
                  <s-table-cell>{payment.customer_name}</s-table-cell>
                  <s-table-cell>${creditTotal.toFixed(2)}</s-table-cell>
                  <s-table-cell>{cuotasCubiertas}</s-table-cell>
                  <s-table-cell>
                    <s-stack direction="block" gap="none">
                      <s-text type="strong">
                        {formatPaymentMethodLabel(payment.payment_method)}
                      </s-text>
                      {payment.bank_name ? (
                        <s-text color="subdued">{payment.bank_name}</s-text>
                      ) : null}
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>${abono.toFixed(2)}</s-table-cell>
                  <s-table-cell>${saldoAFavor.toFixed(2)}</s-table-cell>
                  <s-table-cell>${saldoRestante.toFixed(2)}</s-table-cell>
                  <s-table-cell>
                    {payment.reference_number?.startsWith("INTENT-")
                      ? `RECORDATORIO-${payment.reference_number.split("-")[1]}-ENVIADO`
                      : payment.reference_number}
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge tone={getStatusTone(payment.status)}>
                      {payment.status?.replace(/_/g, " ")}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack gap="small">
                      <s-button-group>
                        <s-button
                          slot="secondary-actions"
                          icon="view"
                          href={`/app/payment_detail/${payment.id}`}
                          accessibilityLabel="Ver detalles de este pago"
                        >
                          Ver Pago
                        </s-button>
                        <s-button
                          slot="secondary-actions"
                          variant="secondary"
                          icon="credit-card"
                          href={`/app/credit_detail/${payment.credit_id}`}
                          accessibilityLabel="Ver crédito asociado a pago"
                        >
                          Ver Crédito
                        </s-button>
                        {payment.status === "APROBADO" && (
                          <s-button
                            slot="secondary-actions"
                            variant="secondary"
                            icon="undo"
                            onClick={() => handleRevertPayment(payment.id)}
                            accessibilityLabel="Revertir cobro aprobado a En revisión"
                          >
                            Revertir
                          </s-button>
                        )}
                        {payment.status !== "CANCELADO" && (
                          <s-button
                            slot="secondary-actions"
                            variant="secondary"
                            tone="critical"
                            icon="delete"
                            onClick={() => handleAnnulPayment(payment)}
                            accessibilityLabel="Anular cobro de forma definitiva"
                          >
                            Anular cobro
                          </s-button>
                        )}
                      </s-button-group>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              );
            })}
            {!loading && payments.length === 0 && (
              <s-table-row>
                <s-table-cell>
                  <div style={{ textAlign: "center", gridColumn: "span 11" }}>
                    <s-text color="subdued">
                      No se encontraron cobros registrados.
                    </s-text>
                  </div>
                </s-table-cell>
              </s-table-row>
            )}
          </s-table-body>
        </s-table>

        <s-divider />

        <s-stack
          direction="inline"
          gap="small"
          padding="base"
          justifyContent="end"
          alignItems="center"
        >
          <s-text color="subdued">{selectedIds.size} seleccionados</s-text>
          <s-button
            tone="auto"
            icon="check"
            disabled={
              selectedIds.size === 0 ||
              hasApprovedSelected ||
              loading ||
              undefined
            }
            onClick={() => handleBatchReview("APROBADO")}
            accessibilityLabel="Aprobar cobros seleccionados"
          >
            Aprobar Pago
          </s-button>
          <s-button
            tone="critical"
            icon="delete"
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={() => handleBatchReview("RECHAZADO")}
            accessibilityLabel="Rechazar cobros seleccionados"
          >
            Rechazar Pago
          </s-button>
          <s-button
            variant="secondary"
            tone="critical"
            icon="delete"
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={handleBatchCancel}
            accessibilityLabel="Anular cobros no aprobados seleccionados"
          >
            Anular cobros
          </s-button>
        </s-stack>
      </s-section>

      <s-divider />

      <s-stack padding="base" alignItems="center">
        <s-text color="subdued">Desarrollado por Opentech LCC</s-text>
        <s-text>
          ¿Tienes alguna duda?{" "}
          <s-link href="https://lccopen.tech/contact" target="_blank">
            Contáctanos
          </s-link>
          .
        </s-text>
      </s-stack>
    </s-page>
  );
}
