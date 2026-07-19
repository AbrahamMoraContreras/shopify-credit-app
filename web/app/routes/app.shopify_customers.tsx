import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import * as React from "react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";

// Shopify customer sacado desde GraphQL
interface ShopifyCustomer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  numberOfOrders: string;
  createdAt: string;
  metafield_doc_type?: { value: string } | null;
  metafield_doc_num?: { value: string } | null;
}

interface BackendCustomer {
  id: number;
  shopify_customer_id: number | null;
  favorable_balance: number;
  punctuality_score: number | null;
  reputation: string | null;
  credits_completed: number;
  credits_incomplete: number;
  payments_on_time: number;
  payments_late: number;
  payments_incomplete: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Hacer fetch Shopify customers desde GraphQL
  const response = await admin.graphql(`
    {
      customers(first: 50) {
        nodes {
          id
          displayName
          email
          phone
          numberOfOrders
          createdAt
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

  const { data } = await response.json();
  const rawCustomers: any[] = data?.customers?.nodes ?? [];

  const customers: ShopifyCustomer[] = rawCustomers.map((c) => {
    const mfs = c.metafields?.nodes || [];
    let docTypeVal = "";
    let docNumVal = "";

    for (const mf of mfs) {
      const val = mf.value || "";
      const key = mf.key.toLowerCase();

      if (!docTypeVal && (key.includes("tipo") || key.includes("doc"))) {
        // Para tipos de documento, extraer la "V" si viene como ["V"]
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) docTypeVal = parsed[0];
          else docTypeVal = val;
        } catch {
          docTypeVal = val;
        }
      }

      if (!docNumVal && (key === "n" || key.includes("num") || key.includes("n_") || key.includes("doc") && !key.includes("tipo"))) {
        docNumVal = val;
      }
    }

    return {
      ...c,
      metafield_doc_type: { value: docTypeVal },
      metafield_doc_num: { value: docNumVal },
    };
  });

  // Hacer Fetch backend customers para obtener balances favorables
  let favorableBalanceMap: Record<number, number> = {};
  let reputationMap: Record<
    number,
    { score: number | null; label: string | null }
  > = {};
  let statsMap: Record<
    number,
    { credits_completed: number; credits_incomplete: number; payments_on_time: number; payments_late: number; payments_incomplete: number }
  > = {};
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    let accessToken = await getAccessTokenForShop(session.shop);

    if (accessToken) {
      const backendRes = await fetch(`${BACKEND_URL}/api/customers?limit=200`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (backendRes.ok) {
        const backendCustomers: BackendCustomer[] = await backendRes.json();
        for (const bc of backendCustomers) {
          if (bc.shopify_customer_id != null) {
            favorableBalanceMap[bc.shopify_customer_id] = Number(
              bc.favorable_balance,
            );
            reputationMap[bc.shopify_customer_id] = {
              score: bc.punctuality_score,
              label: bc.reputation,
            };
            statsMap[bc.shopify_customer_id] = {
              credits_completed: bc.credits_completed ?? 0,
              credits_incomplete: bc.credits_incomplete ?? 0,
              payments_on_time: bc.payments_on_time ?? 0,
              payments_late: bc.payments_late ?? 0,
              payments_incomplete: bc.payments_incomplete ?? 0,
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("[shopify_customers] Failed to fetch backend customers:", e);
  }

  return { customers, favorableBalanceMap, reputationMap, statsMap };
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const accessToken = await getAccessTokenForShop(session.shop);
  const formData = await request.formData();
  const shopifyNumericId = formData.get("shopifyNumericId");
  const intent = formData.get("intent");

  if (intent === "reset-balance" && shopifyNumericId) {
    const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/customers/shopify/${shopifyNumericId}/reset-balance`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) return { error: "Error al resetear balance" };
      return { success: true };
    } catch {
      return { error: "Error de red" };
    }
  }
  return null;
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function ShopifyCustomers() {
  const { customers, favorableBalanceMap, reputationMap, statsMap } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [activeModalCustomerId, setActiveModalCustomerId] = useState<number | null>(null);

  const openBalanceModal = (numericId: number) => {
    setActiveModalCustomerId(numericId);
    // Use setTimeout to ensure state is set before showing modal
    setTimeout(() => {
      (window as any).shopify?.modal?.show("balance-modal");
    }, 50);
  };

  const closeBalanceModal = () => {
    (window as any).shopify?.modal?.hide("balance-modal");
    setActiveModalCustomerId(null);
  };

  const handleResetBalance = () => {
    if (activeModalCustomerId == null) return;
    if (
      !window.confirm(
        "¿Estás seguro de que deseas vaciar el saldo a favor de este cliente? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    submit(
      { intent: "reset-balance", shopifyNumericId: String(activeModalCustomerId) },
      { method: "post" },
    );
    closeBalanceModal();
  };

  const reputationBadge = (label: string | null) => {
    const config: Record<
      string,
      { tone: string; emoji: string; text: string }
    > = {
      excelente: { tone: "success", emoji: "⭐", text: "Excelente" },
      buena: { tone: "info", emoji: "👍", text: "Buena" },
      regular: { tone: "attention", emoji: "⚠️", text: "Regular" },
      mala: { tone: "critical", emoji: "❌", text: "Mala" },
      sin_historial: { tone: "", emoji: "—", text: "Sin historial" },
    };
    const c = config[label ?? "sin_historial"] ?? config["sin_historial"];
    if (!c.tone) return <s-text color="subdued">{c.emoji}</s-text>;
    const badgeTone = (c.tone as any) || "info";
    return (
      <s-badge tone={badgeTone}>
        {c.emoji} {c.text}
      </s-badge>
    );
  };

  const getShopifyNumericId = (gid: string) => {
    const parts = gid.split("/");
    return parseInt(parts[parts.length - 1], 10);
  };

  const totalRegistrados = customers.length;
  const operacionesActivas = Object.values(statsMap).filter((s) => s.credits_incomplete > 0).length;
  const clientesMorosos = Object.values(statsMap).filter((s) => s.payments_late > 0).length;
  const pagosPendientes = Object.values(statsMap).reduce((acc, curr) => acc + curr.payments_late, 0);
  const pagosCompletados = Object.values(statsMap).reduce((acc, curr) => acc + curr.payments_on_time, 0);

  return (
    <s-page heading="Clientes de Shopify">
      <s-stack gap="large">
        {/* Summary */}
        <s-grid gridTemplateColumns="repeat(5, 1fr)" gap="small" padding="base">
          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Total de clientes registrados</s-text>
                <s-heading>{totalRegistrados}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Clientes con Operaciones Activas</s-text>
                <s-heading>{operacionesActivas}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Clientes Morosos</s-text>
                <s-heading>{clientesMorosos}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Número de cobros pendientes</s-text>
                <s-heading>{pagosPendientes}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Número de cobros completados</s-text>
                <s-heading>{pagosCompletados}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>
        </s-grid>

        {/* Customers Table */}
        <s-section
          padding="base"
          accessibilityLabel="Lista de Clientes Shopify"
        >
          {customers.length === 0 ? (
            <s-text color="subdued">
              No hay clientes registrados en esta tienda.
            </s-text>
          ) : (
            <s-table>
              <s-table-header-row>
                <s-table-header listSlot="primary">Nombre</s-table-header>
                <s-table-header>Documento</s-table-header>
                <s-table-header>Email</s-table-header>
                <s-table-header>Teléfono</s-table-header>
                <s-table-header format="numeric">Órdenes</s-table-header>
                <s-table-header listSlot="primary" format="numeric">
                  Saldo a Favor
                </s-table-header>
                <s-table-header>Reputación</s-table-header>
                <s-table-header format="numeric">Créd. Completados</s-table-header>
                <s-table-header format="numeric">Créd. Pendientes</s-table-header>
                <s-table-header format="numeric">Cobros a Tiempo</s-table-header>
                <s-table-header format="numeric">Cobros Tardíos</s-table-header>
                <s-table-header format="numeric">Cobros No Completados</s-table-header>

                <s-table-header>Acciones</s-table-header>
              </s-table-header-row>

              <s-table-body>
                {customers.map((customer) => {
                  const numericId = getShopifyNumericId(customer.id);
                  const saldo = favorableBalanceMap[numericId];
                  const hasSaldo = saldo != null && saldo > 0;
                  const stats = statsMap[numericId];

                  const docType = customer.metafield_doc_type?.value || "";
                  const docNum = customer.metafield_doc_num?.value || "";
                  const displayDoc =
                    docType && docNum ? `${docType}-${docNum}` : "—";

                  return (
                    <s-table-row key={customer.id}>
                      <s-table-cell>
                        <s-text>{customer.displayName}</s-text>
                      </s-table-cell>
                      <s-table-cell>
                        <s-text>{displayDoc}</s-text>
                      </s-table-cell>
                      <s-table-cell>
                        <s-text>{customer.email ?? "—"}</s-text>
                      </s-table-cell>
                      <s-table-cell>
                        <s-text>{customer.phone ?? "—"}</s-text>
                      </s-table-cell>
                      <s-table-cell>{customer.numberOfOrders}</s-table-cell>
                      <s-table-cell>
                        {hasSaldo ? (
                          <s-badge tone="success">${saldo.toFixed(2)}</s-badge>
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {reputationBadge(
                          reputationMap[numericId]?.label ?? null,
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {stats ? (
                          stats.credits_completed > 0 ? (
                            <s-badge tone="success">{stats.credits_completed}</s-badge>
                          ) : (
                            <s-text color="subdued">0</s-text>
                          )
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {stats ? (
                          stats.credits_incomplete > 0 ? (
                            <s-badge tone="warning">{stats.credits_incomplete}</s-badge>
                          ) : (
                            <s-text color="subdued">0</s-text>
                          )
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {stats ? (
                          stats.payments_on_time > 0 ? (
                            <s-badge tone="success">{stats.payments_on_time}</s-badge>
                          ) : (
                            <s-text color="subdued">0</s-text>
                          )
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {stats ? (
                          stats.payments_late > 0 ? (
                            <s-badge tone="critical">{stats.payments_late}</s-badge>
                          ) : (
                            <s-text color="subdued">0</s-text>
                          )
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {stats ? (
                          stats.payments_incomplete > 0 ? (
                            <s-badge tone="warning">{stats.payments_incomplete}</s-badge>
                          ) : (
                            <s-text color="subdued">0</s-text>
                          )
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        <s-stack
                          direction="inline"
                          gap="small-100"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <s-button
                            id={`manage-balance-${numericId}`}
                            onClick={() => openBalanceModal(numericId)}
                            accessibilityLabel="Gestionar saldo a favor del cliente"
                          >
                            Gestionar saldo
                          </s-button>
                          <s-button
                            href={`/app/customer_detail/${numericId}`}
                            accessibilityLabel="Ver detalles del cliente"
                          >
                            Ver cliente
                          </s-button>
                        </s-stack>
                      </s-table-cell>
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>
          )}
        </s-section>

        {/* Footer */}
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

        {/* Modal Gestionar Saldo - always in DOM, controlled via shopify.modal API */}
        <s-modal id="balance-modal">
          <s-box padding="base">
            {activeModalCustomerId !== null ? (() => {
              const selectedCustomer = customers.find((c) => getShopifyNumericId(c.id) === activeModalCustomerId);
              const saldo = favorableBalanceMap[activeModalCustomerId] ?? 0;
              return (
                <s-stack gap="base" direction="block">
                  <s-heading>Gestionar Saldo a Favor</s-heading>
                  <s-text>
                    Cliente: <strong>{selectedCustomer?.displayName ?? "—"}</strong>
                  </s-text>
                  <s-text>
                    Saldo a favor actual: <strong>${saldo.toFixed(2)}</strong>
                  </s-text>

                  {saldo > 0 ? (
                    <s-paragraph>
                      Puedes vaciar el saldo a favor de este cliente si es necesario (por ejemplo, si se hizo un reembolso externo o un ajuste manual).
                    </s-paragraph>
                  ) : (
                    <s-paragraph>
                      Este cliente no tiene saldo a favor actualmente.
                    </s-paragraph>
                  )}

                  <s-stack direction="inline" gap="small" justifyContent="end">
                    <s-button variant="secondary" onClick={() => closeBalanceModal()}>
                      Cerrar
                    </s-button>
                    {saldo > 0 && (
                      <s-button
                        variant="primary"
                        tone="critical"
                        onClick={() => handleResetBalance()}
                        disabled={navigation.state !== "idle"}
                      >
                        Vaciar Saldo
                      </s-button>
                    )}
                  </s-stack>
                </s-stack>
              );
            })() : (
              <s-text>Cargando...</s-text>
            )}
          </s-box>
        </s-modal>
      </s-stack>
    </s-page>
  );
}
