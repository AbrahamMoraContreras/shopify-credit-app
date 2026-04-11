import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";
import { ClientDate } from "../components/ClientDate";

interface PaymentListItem {
  id: number;
  credit_id: number;
  amount: number; // Último Abono
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
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) throw new Error("Token no disponible");

  const url = new URL(request.url);
  const page = url.searchParams.get("page") || "1";
  const pageSize = 20;
  const offset = (Number(page) - 1) * pageSize;

  const payment_id = url.searchParams.get("payment_id") || "";
  const credit_id = url.searchParams.get("credit_id") || "";
  const customer_name = url.searchParams.get("customer_name") || "";
  const payment_date = url.searchParams.get("payment_date") || "";

  const params = new URLSearchParams({
    limit: pageSize.toString(),
    offset: offset.toString(),
  });
  if (payment_id) params.append("payment_id", payment_id);
  if (credit_id) params.append("credit_id", credit_id);
  if (customer_name) params.append("customer_name", customer_name);
  if (payment_date) params.append("payment_date", payment_date);

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const [paymentsRes, proofsRes] = await Promise.all([
    fetch(`${BACKEND_URL}/api/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`${BACKEND_URL}/api/payments/payment-proofs?status=PENDIENTE`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  const payments = await paymentsRes.json();
  const proofs = await proofsRes.json();

  return {
    payments,
    proofs: Array.isArray(proofs)
      ? proofs.filter((p: any) => p.status === "PENDIENTE")
      : [],
    page: Number(page),
    filters: { payment_id, credit_id, customer_name, payment_date },
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
      await fetch(`${BACKEND_URL}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ payment_ids, status }),
      });
    } else if (intent === "batch-delete") {
      const payment_ids = JSON.parse(formData.get("payment_ids") as string);
      await fetch(`${BACKEND_URL}/api/payments/batch-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ payment_ids }),
      });
    } else if (intent === "batch-cancel") {
      const payment_ids = JSON.parse(formData.get("payment_ids") as string);
      await fetch(`${BACKEND_URL}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ payment_ids, status: "CANCELADO" }),
      });
    } else if (intent === "revert") {
      const id = formData.get("id");
      await fetch(`${BACKEND_URL}/api/payments/${id}/review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status: "EN_REVISION" }),
      });
    } else if (intent === "approve-proof" || intent === "reject-proof") {
      const payment_id = Number(formData.get("payment_id"));
      const proof_id = formData.get("proof_id");
      const status = intent === "approve-proof" ? "APROBADO" : "RECHAZADO";

      const res = await fetch(`${BACKEND_URL}/api/payments/batch-review`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ payment_ids: [payment_id], status }),
      });
      if (res.ok) {
        await fetch(
          `${BACKEND_URL}/api/payments/payment-proofs/${proof_id}/mark-reviewed`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
      }
    } else if (intent === "clear-proofs") {
      await fetch(`${BACKEND_URL}/api/payments/payment-proofs`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
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
  } = useLoaderData<typeof loader>() as {
    payments: PaymentListItem[];
    proofs: PaymentProof[];
    page: number;
    filters: any;
  };
  const submit = useSubmit();
  const navigation = useNavigation();

  const loading =
    navigation.state === "loading" || navigation.state === "submitting";
  const proofsLoading = false;
  const [page, setPage] = useState(loaderPage || 1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterState, setFilterState] = useState(filters);
  const pageSize = 20;

  useEffect(() => {
    setSelectedIds(new Set());
  }, [payments]);

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
      payment_date: "",
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
    if (!confirm(`¿Está seguro de eliminar ${selectedIds.size} pagos?`)) return;
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
    if (
      !confirm(
        "¿Seguro que deseas cancelar los pagos seleccionados? Se revertirá en resuelto en el crédito asociado.",
      )
    )
      return;
    submit(
      {
        intent: "batch-cancel",
        payment_ids: JSON.stringify(Array.from(selectedIds)),
      },
      { method: "post" },
    );
  };

  const handleRevertPayment = (id: number) => {
    if (!confirm("¿Seguro que deseas revertir este pago a EN_REVISION?"))
      return;
    submit({ intent: "revert", id: id.toString() }, { method: "post" });
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
        Abono: `$${abono.toFixed(2)}`,
        "Balance Cliente": `$${saldoAFavor.toFixed(2)}`,
        "Balance Restante": `$${saldoRestante.toFixed(2)}`,
        Referencia: p.reference_number,
        Estado: p.status,
      };
    });

    if (format === "csv" || format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pagos");
      if (format === "csv") {
        XLSX.writeFile(wb, "pagos.csv");
      } else {
        XLSX.writeFile(wb, "pagos.xlsx");
      }
    } else if (format === "pdf") {
      const doc = new jsPDF("landscape");
      doc.text("Reporte de Pagos", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [
          [
            "ID Pago",
            "ID Crédito",
            "Fecha",
            "Cliente",
            "Total Crédito",
            "Abono",
            "Balance Restante",
            "Estado",
          ],
        ],
        body: exportData.map((d) => [
          d["ID Pago"],
          d["ID Crédito"],
          d["Fecha"],
          d.Cliente,
          d["Total Crédito"],
          d.Abono,
          d["Balance Restante"],
          d.Estado,
        ]),
      });
      doc.save("pagos.pdf");
    }
  };

  return (
    <s-page heading="Historial de Pagos" inlineSize="large">
      <s-button
        slot="primary-action"
        icon="plus"
        href="/app/registre_payment"
        accessibilityLabel="Ir a registrar pago"
      >
        Registrar Pago
      </s-button>

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
        <s-heading paddingBlockEnd="base">Lista de Pagos</s-heading>

        <s-stack
          direction="inline"
          inlineAlignment="space-between"
          blockAlignment="center"
          gap="base"
          paddingBlockEnd="base"
        >
          {/* IZQUIERDA: búsqueda + menú */}
          <s-stack direction="inline" blockAlignment="center" gap="base">
            <s-search-field
              placeholder="Buscar por cliente..."
              value={filterState.customer_name}
              onInput={(e: any) =>
                setFilterState({
                  ...filterState,
                  customer_name: e.target.value,
                })
              }
            ></s-search-field>

            <s-popover>
              <s-button slot="activator" variant="secondary" icon="filter">
                Más Filtros
              </s-button>
              <s-box padding="base" style={{ minWidth: "260px" }}>
                <s-stack direction="block" gap="base">
                  <s-text-field
                    type="number"
                    label="ID Pago"
                    value={filterState.payment_id}
                    onInput={(e: any) =>
                      setFilterState({
                        ...filterState,
                        payment_id: e.target.value,
                      })
                    }
                  />
                  <s-text-field
                    type="number"
                    label="ID Crédito"
                    value={filterState.credit_id}
                    onInput={(e: any) =>
                      setFilterState({
                        ...filterState,
                        credit_id: e.target.value,
                      })
                    }
                  />
                  <s-text-field
                    type="date"
                    label="Fecha de Pago"
                    value={filterState.payment_date}
                    onInput={(e: any) =>
                      setFilterState({
                        ...filterState,
                        payment_date: e.target.value,
                      })
                    }
                  />
                </s-stack>
              </s-box>
            </s-popover>

            <s-button onClick={handleSearch} variant="primary">
              Buscar
            </s-button>
            <s-button onClick={clearSearch}>Limpiar</s-button>
          </s-stack>

          {/* DERECHA: acciones */}
          <s-stack direction="inline" gap="base">
            <s-button variant="secondary" onClick={() => handleExport("csv")}>
              Exportar CSV
            </s-button>
            <s-button variant="secondary" onClick={() => handleExport("xlsx")}>
              Exportar XLSX
            </s-button>
            <s-button variant="secondary" onClick={() => handleExport("pdf")}>
              Exportar PDF
            </s-button>
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
                  <s-table-cell>${abono.toFixed(2)}</s-table-cell>
                  <s-table-cell>${saldoAFavor.toFixed(2)}</s-table-cell>
                  <s-table-cell>${saldoRestante.toFixed(2)}</s-table-cell>
                  <s-table-cell>{payment.reference_number}</s-table-cell>
                  <s-table-cell>
                    <s-badge tone={getStatusTone(payment.status)}>
                      {payment.status}
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
                        {payment.status !== "EN_REVISION" && (
                          <s-button
                            slot="secondary-actions"
                            variant="secondary"
                            icon="undo"
                            onClick={() => handleRevertPayment(payment.id)}
                            accessibilityLabel="Revertir el estado de este pago a revisión"
                          >
                            Revertir
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
                      No se encontraron pagos registrados.
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
            accessibilityLabel="Aprobar pagos seleccionados"
          >
            Aprobar Pago
          </s-button>
          <s-button
            tone="critical"
            icon="delete"
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={() => handleBatchReview("RECHAZADO")}
            accessibilityLabel="Rechazar pagos seleccionados"
          >
            Rechazar Pago
          </s-button>
          <s-button
            variant="secondary"
            tone="critical"
            icon="delete"
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={handleBatchCancel}
            accessibilityLabel="Cancelar pagos seleccionados y revertir monto al crédito"
          >
            Cancelar Pago
          </s-button>
          <s-button
            tone="critical"
            variant="secondary"
            icon="delete"
            disabled={selectedIds.size === 0 || loading || undefined}
            onClick={handleBatchDelete}
            accessibilityLabel="Eliminar pagos seleccionados"
          >
            Eliminar Pago
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
