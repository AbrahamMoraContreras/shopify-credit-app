//app.credits.tsx

import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import { Credit } from "web/app/types/credit";
import { redirect } from "@remix-run/node";
import { useState } from "react";
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
    if (error instanceof Response && error.status === 401 && isDocumentRequest(request)) {
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

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
  const response = await fetch(`${BACKEND_URL}/api/credits`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Error cargando créditos");
  }

  const credits: Credit[] = await response.json();
  // En Remix es recomendable devolver `json({ credits })`, pero tu runtime puede aceptar POJOs
  return { credits };
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
      headers: { "Authorization": `Bearer ${accessToken}` }
    });
    if (!res.ok) return { error: "No se pudo eliminar el crédito" };
    return { success: true };
  }

  if (intent === "cancel") {
    const res = await fetch(`${BACKEND_URL}/api/credits/${id}/cancel`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${accessToken}` }
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
  const { credits: loaderCredits } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  // Mantenemos credits en estado local solo para optimismo en eliminación (opcional)
  // Pero lo ideal es confiar en el loader revalidation. Remix re-ejecuta el loader exitosamente después de cada action.
  const loading = navigation.state === "loading" || navigation.state === "submitting";

  const credits = loaderCredits; // The UI uses the direct data from loader

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const hasNextPage = credits.length === pageSize;
  const hasPreviousPage = page > 1;

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
      '¿Seguro que deseas eliminar este crédito? Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;

    submit({ intent: "delete", id: id.toString() }, { method: "post" });
  }

  async function handleCancel(id: number, e: Event) {
    if (e && e.preventDefault) e.preventDefault();
    const confirmed = window.confirm(
      '¿Seguro que deseas cancelar este crédito? Los pagos esperados se eliminarán de la lista.',
    );
    if (!confirmed) return;

    submit({ intent: "cancel", id: id.toString() }, { method: "post" });
  }

  const formatNotes = (notes: string | null | undefined) => {
    if (!notes) return "—";
    let cleaned = notes.replace(/\[DISTRIBUTE_EXCESS\]/g, 'Distribución de Excedente');
    cleaned = cleaned.replace(/Doc:\s*[^\|]+\|\s*Teléf:\s*[^\|]+\|\s*Extra:\s*.*/gi, '');
    return cleaned.trim() || "—";
  };


  return (
    <s-page heading="Créditos" inlineSize="large">
      <s-button variant="primary" slot="primary-action" href="/app/registre_credit" accessibilityLabel="Ir a registrar crédito">
        Registrar Crédito
      </s-button>

      <s-section>
        <s-heading>Lista de Créditos Emitidos</s-heading>

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
            <s-table-header listSlot='primary' format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  ID
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                Fecha
              </s-stack>
            </s-table-header>
            <s-table-header>
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Cliente
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Monto Crédito
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Último Abono
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Saldo Restante
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Detalle de último abono
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Observaciones de Abono
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Número de cuotas
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Estatus
                </s-text>
              </s-stack>
            </s-table-header>
            <s-table-header  format="base">
              <s-stack direction="inline" justifyContent="center">
                <s-text>
                  Acciones
                </s-text>
              </s-stack>
            </s-table-header>
          </s-table-header-row>

          <s-table-body>
            {/* Data rows */}
            {credits.map((credit) => (
              <s-table-row
                key={credit.id}
              >
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
                      {credit.customer?.full_name || 'Desconocido'}
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
                      {credit.last_payment_amount ? formatCurrency(credit.last_payment_amount) : "—"}
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
                  <s-stack direction="block" alignItems="center" gap="none" >
                    {credit.last_payment_date && (
                      <s-text   color="subdued">
                        {formatDate(credit.last_payment_date)}
                      </s-text>
                    )}
                    {credit.last_payment_reference && (
                      <s-text   color="subdued" fontVariantNumeric="tabular-nums">
                        Ref: {credit.last_payment_reference}
                      </s-text>
                    )}
                     {credit.last_payment_method && (
                      <s-text   color="subdued">
                         {credit.last_payment_method === 'BANK' ? 'Transf. Bancaria' : 
                          credit.last_payment_method === 'PAGO_MOVIL' ? 'Pago Móvil' : 
                          credit.last_payment_method === 'PAYPAL' ? 'PayPal' : 
                          credit.last_payment_method === 'CASH' ? 'Efectivo USD' : 
                          credit.last_payment_method === 'EFECTIVO' ? 'Efectivo VEF' : 
                          credit.last_payment_method}
                      </s-text>
                    )}
                    {!credit.last_payment_date && !credit.last_payment_method && (
                      <s-text   color="subdued">—</s-text>
                    )}
                  </s-stack>
                </s-table-cell>

                <s-table-cell>
                  <s-stack direction="inline" justifyContent="center">
                    <s-text>
                      {formatNotes(credit.last_payment_notes)}
                    </s-text>
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
                        credit.status === 'EMITIDO' ? 'neutral' : 
                        credit.status === 'PENDIENTE_ACTIVACION' ? 'warning' : 
                        credit.status === 'EN_PROGRESO' ? 'info' : 
                        credit.status === 'PAGADO' ? 'success' : 
                        credit.status === 'CANCELADO' ? 'critical' : 
                        'info'
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
                        accessibilityLabel="Ver información detallada de este crédito">
                        Detalles
                      </s-button>
                    </s-button-group>
                    <s-button-group>

                      <s-button 
                        slot="secondary-actions" 
                        icon="payment" 
                        href={`/app/payments?creditId=${credit.id}`} 
                        accessibilityLabel="Ver pagos de este crédito">
                        Pagos
                      </s-button>
                    </s-button-group>
                    <s-button-group>

                      <s-button 
                        slot="secondary-actions" 
                        variant="secondary" 
                        tone="critical"
                        icon="x-circle"
                        disabled={credit.status === 'CANCELADO' || credit.status === 'PAGADO'}
                        onClick={(event: Event) => handleCancel(credit.id, event)}
                        accessibilityLabel="Cancelar este crédito y anular cuotas pendientes">
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
                        accessibilityLabel="Eliminar permanentemente este registro de crédito">
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
          <s-stack padding="base" alignItems="center">
            <s-text>¿Tienes alguna duda?<s-link href="/app/credit_detail">Contáctanos</s-link>.</s-text>
          </s-stack>
    </s-page>
  );
}
