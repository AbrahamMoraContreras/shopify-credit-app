//app.credits.tsx

import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { Credit } from "web/app/types/credit";
import { redirect } from "@remix-run/node";
import { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAccessTokenForShop } from "../lib/auth.server";
import { authenticate } from "../shopify.server";

function isDocumentRequest(request: Request) {
  const accept = request.headers.get("Accept") || "";
  const xrw = request.headers.get("X-Requested-With") || "";
  // Heurística simple: si acepta HTML y no es XHR, lo tratamos como documento
  return accept.includes("text/html") && xrw !== "XMLHttpRequest";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let session;

  try {
    ({ session } = await authenticate.admin(request));
  } catch (error: any) {
    // Si authenticate.admin lanza un Response (por ejemplo 401 inválido)
    if (
      error instanceof Response &&
      error.status === 401 &&
      isDocumentRequest(request)
    ) {
      // Para peticiones de documento: redirigir a /auth (o tu bounce page)
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop");
      if (shop) {
        return redirect(`/auth?shop=${shop}`);
      }
    }

    // Para XHR, o si no podemos inferir shop, dejamos que el 401 se propague
    throw error;
  }

  const accessToken = await getAccessTokenForShop(session.shop);
  if (!accessToken) {
    throw new Error("Token no disponible");
  }

  const url = new URL(request.url);
  const credit_id = url.searchParams.get("credit_id") || "";
  const customer_name = url.searchParams.get("customer_name") || "";
  const created_at_date = url.searchParams.get("created_at_date") || "";
  const due_date = url.searchParams.get("due_date") || "";

  const params = new URLSearchParams();
  if (credit_id) params.append("credit_id", credit_id);
  if (customer_name) params.append("customer_name", customer_name);
  if (created_at_date) params.append("created_at_date", created_at_date);
  if (due_date) params.append("due_date", due_date);

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const response = await fetch(
    `${BACKEND_URL}/api/credits?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error("Error cargando créditos");
  }

  const credits: Credit[] = await response.json();
  return {
    credits,
    filters: { credit_id, customer_name, created_at_date, due_date },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const id = formData.get("id");

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  if (intent === "delete") {
    const res = await fetch(`${BACKEND_URL}/api/credits/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { error: "No se pudo eliminar el crédito" };
    return { success: true };
  }

  if (intent === "cancel") {
    const res = await fetch(`${BACKEND_URL}/api/credits/${id}/cancel`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { error: "No se pudo cancelar el crédito" };
    return { success: true };
  }

  return null;
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function CreditHistorial() {
  const { credits: loaderCredits, filters } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const loading =
    navigation.state === "loading" || navigation.state === "submitting";

  const credits = loaderCredits;

  const [filterState, setFilterState] = useState(filters);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const hasNextPage = credits.length === pageSize;
  const hasPreviousPage = page > 1;

  const handleSearch = () => {
    const fd = new FormData();
    Object.entries(filterState).forEach(([k, v]) => {
      if (v) fd.append(k, v as string);
    });
    submit(fd, { method: "get" });
  };

  const clearSearch = () => {
    setFilterState({
      credit_id: "",
      customer_name: "",
      created_at_date: "",
      due_date: "",
    });
    submit({}, { method: "get" });
  };

  const formatDate = (isoDate: string) => {
    if (!isoDate) return "—";
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }).format(new Date(isoDate));
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  };

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "¿Seguro que deseas eliminar este crédito? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    submit({ intent: "delete", id: id.toString() }, { method: "post" });
  }

  async function handleCancel(id: number, e: Event) {
    if (e && e.preventDefault) e.preventDefault();
    const confirmed = window.confirm(
      "¿Seguro que deseas cancelar este crédito? Los pagos esperados se eliminarán de la lista.",
    );
    if (!confirmed) return;

    submit({ intent: "cancel", id: id.toString() }, { method: "post" });
  }

  const formatNotes = (notes: string | null | undefined) => {
    if (!notes) return "—";
    let cleaned = notes.replace(
      /\[DISTRIBUTE_EXCESS\]/g,
      "Distribución de Excedente",
    );
    cleaned = cleaned.replace(
      /Doc:\s*[^\|]+\|\s*Teléf:\s*[^\|]+\|\s*Extra:\s*.*/gi,
      "",
    );
    return cleaned.trim() || "—";
  };

  const handleExport = (format: string) => {
    if (!format || !credits.length) return;

    const exportData = credits.map((c) => ({
      ID: c.id,
      Fecha: formatDate(c.created_at),
      Cliente: c.customer?.full_name || "Desconocido",
      "Monto Crédito": formatCurrency(c.total_amount),
      Balance: formatCurrency(c.balance),
      "Último Abono": formatCurrency(c.last_payment_amount),
      Estatus: c.status,
    }));

    if (format === "csv" || format === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Creditos");
      if (format === "csv") {
        XLSX.writeFile(wb, "creditos.csv");
      } else {
        XLSX.writeFile(wb, "creditos.xlsx");
      }
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.text("Reporte de Créditos", 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [
          [
            "ID",
            "Fecha",
            "Cliente",
            "Monto Crédito",
            "Balance",
            "Último Abono",
            "Estatus",
          ],
        ],
        body: exportData.map((d) => [
          d.ID,
          d.Fecha,
          d.Cliente,
          d["Monto Crédito"],
          d.Balance,
          d["Último Abono"],
          d.Estatus,
        ]),
      });
      doc.save("creditos.pdf");
    }
  };

  return (
    <s-page heading="Créditos" inlineSize="large">
      <s-button
        variant="primary"
        slot="primary-action"
        href="/app/registre_credit"
        accessibilityLabel="Ir a registrar crédito"
      >
        Registrar Crédito
      </s-button>

      <s-section>
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          paddingBlockEnd="base"
        >
          <s-heading>Lista de Créditos Emitidos</s-heading>
          <s-select
            value=""
            onChange={(e: any) => handleExport(e.target.value)}
          >
            <s-option value="" disabled>
              Exportar Datos...
            </s-option>
            <s-option value="csv">Exportar a CSV</s-option>
            <s-option value="xlsx">Exportar a XLSX</s-option>
            <s-option value="pdf">Exportar a PDF</s-option>
          </s-select>
        </s-stack>

        <s-stack direction="block" gap="base" paddingBlockEnd="base">
          <s-stack direction="inline" gap="small" alignItems="end">
            <s-text-field
              type="number"
              label="ID Crédito"
              value={filterState.credit_id}
              onInput={(e: any) =>
                setFilterState({ ...filterState, credit_id: e.target.value })
              }
            />
            <s-text-field
              type="text"
              label="Cliente"
              value={filterState.customer_name}
              onInput={(e: any) =>
                setFilterState({
                  ...filterState,
                  customer_name: e.target.value,
                })
              }
            />
            <s-text-field
              type="date"
              label="Emisión"
              value={filterState.created_at_date}
              onInput={(e: any) =>
                setFilterState({
                  ...filterState,
                  created_at_date: e.target.value,
                })
              }
            />
            <s-text-field
              type="date"
              label="Vencimiento Cuota"
              value={filterState.due_date}
              onInput={(e: any) =>
                setFilterState({ ...filterState, due_date: e.target.value })
              }
            />
            <s-button onClick={handleSearch} variant="primary">
              Buscar
            </s-button>
            <s-button onClick={clearSearch}>Limpiar</s-button>
          </s-stack>
        </s-stack>

        <s-table
          paginate
          loading={loading}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onNextPage={() => {
            if (hasNextPage) {
              setPage((p) => p + 1);
            }
          }}
          onPreviousPage={() => {
            if (hasPreviousPage) {
              setPage((p) => Math.max(1, p - 1));
            }
          }}
        >
          {/* Header row */}
          <s-table-header-row>
            <s-table-header listSlot="primary" format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>ID</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                Fecha
              </s-stack>
            </s-table-header>
            <s-table-header>
              <s-stack direction="inline" justifyContent="center">
                <s-text>Cliente</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Monto Crédito</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Último Abono</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Saldo Restante</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Detalle de último abono</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Observaciones de Abono</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Número de cuotas</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Estatus</s-text>
              </s-stack>
            </s-table-header>
            <s-table-header format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>Acciones</s-text>
              </s-stack>
            </s-table-header>
          </s-table-header-row>

          <s-table-body>
            {/* Data rows */}
            {credits.map((credit) => (
              <s-table-row key={credit.id}>
                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {credit.id}
                  </s-stack>
                </s-table-cell>
                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    {formatDate(credit.created_at)}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-text>
                      {credit.customer?.full_name || "Desconocido"}
                    </s-text>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-text fontVariantNumeric="tabular-nums">
                      {formatCurrency(credit.total_amount)}
                    </s-text>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-text fontVariantNumeric="tabular-nums">
                      {credit.last_payment_amount
                        ? formatCurrency(credit.last_payment_amount)
                        : "—"}
                    </s-text>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-text fontVariantNumeric="tabular-nums">
                      {formatCurrency(credit.balance)}
                    </s-text>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="block" alignItems="center" gap="none">
                    {credit.last_payment_date && (
                      <s-text color="subdued">
                        {formatDate(credit.last_payment_date)}
                      </s-text>
                    )}
                    {credit.last_payment_reference && (
                      <s-text color="subdued" fontVariantNumeric="tabular-nums">
                        Ref: {credit.last_payment_reference}
                      </s-text>
                    )}
                    {credit.last_payment_method && (
                      <s-text color="subdued">
                        {credit.last_payment_method === "BANK"
                          ? "Transf. Bancaria"
                          : credit.last_payment_method === "PAGO_MOVIL"
                            ? "Pago Móvil"
                            : credit.last_payment_method === "PAYPAL"
                              ? "PayPal"
                              : credit.last_payment_method === "CASH"
                                ? "Efectivo USD"
                                : credit.last_payment_method === "EFECTIVO"
                                  ? "Efectivo VEF"
                                  : credit.last_payment_method}
                      </s-text>
                    )}
                    {!credit.last_payment_date &&
                      !credit.last_payment_method && (
                        <s-text color="subdued">—</s-text>
                      )}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-text>{formatNotes(credit.last_payment_notes)}</s-text>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-text fontVariantNumeric="tabular-nums">
                      {credit.installments_count}
                    </s-text>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
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
                                : credit.status === "CANCELADO"
                                  ? "critical"
                                  : "info"
                      }
                    >
                      {credit.status}
                    </s-badge>
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack gap="small">
                    <s-button-group>
                      <s-button
                        slot="secondary-actions"
                        icon="view"
                        href={`/app/credit_detail/${credit.id}`}
                        accessibilityLabel="Ver información detallada de este crédito"
                      >
                        Detalles
                      </s-button>
                    </s-button-group>
                    <s-button-group>
                      <s-button
                        slot="secondary-actions"
                        icon="payment"
                        href={`/app/payments?creditId=${credit.id}`}
                        accessibilityLabel="Ver pagos de este crédito"
                      >
                        Pagos
                      </s-button>
                    </s-button-group>
                    <s-button-group>
                      <s-button
                        slot="secondary-actions"
                        variant="secondary"
                        tone="critical"
                        icon="x-circle"
                        disabled={
                          credit.status === "CANCELADO" ||
                          credit.status === "PAGADO"
                        }
                        onClick={(event: Event) =>
                          handleCancel(credit.id, event)
                        }
                        accessibilityLabel="Cancelar este crédito y anular cuotas pendientes"
                      >
                        Cancelar
                      </s-button>
                    </s-button-group>
                    <s-button-group>
                      <s-button
                        slot="secondary-actions"
                        variant="secondary"
                        tone="critical"
                        icon="delete"
                        onClick={() => handleDelete(credit.id)}
                        accessibilityLabel="Eliminar permanentemente este registro de crédito"
                      >
                        Eliminar
                      </s-button>
                    </s-button-group>
                  </s-stack>
                </s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>

      <s-divider />

      {/*Footer*/}
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
    </s-page>
  );
}
