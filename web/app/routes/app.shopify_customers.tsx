import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, useNavigation } from "react-router";
import * as React from "react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";

// Shopify customer node shape from GraphQL
interface ShopifyCustomer {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  numberOfOrders: string;
  createdAt: string;
}

interface BackendCustomer {
  id: number;
  shopify_customer_id: number | null;
  favorable_balance: number;
  punctuality_score: number | null;
  reputation: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // 1. Fetch Shopify customers from GraphQL
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
        }
      }
    }
  `);

  const { data } = await response.json();
  const customers: ShopifyCustomer[] = data?.customers?.nodes ?? [];

  // 2. Fetch backend customers to get favorable balances
  let favorableBalanceMap: Record<number, number> = {};
  let reputationMap: Record<number, { score: number | null; label: string | null }> = {};
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    let accessToken = await getAccessTokenForShop(session.shop);

    if (accessToken) {
      const backendRes = await fetch(`${BACKEND_URL}/api/customers?limit=200`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      if (backendRes.ok) {
        const backendCustomers: BackendCustomer[] = await backendRes.json();
        for (const bc of backendCustomers) {
          if (bc.shopify_customer_id != null) {
            favorableBalanceMap[bc.shopify_customer_id] = Number(bc.favorable_balance);
            reputationMap[bc.shopify_customer_id] = {
              score: bc.punctuality_score,
              label: bc.reputation,
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("[shopify_customers] Failed to fetch backend customers:", e);
  }

  return { customers, favorableBalanceMap, reputationMap };
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
      const res = await fetch(`${BACKEND_URL}/api/customers/shopify/${shopifyNumericId}/reset-balance`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      if (!res.ok) return { error: "Error al resetear balance" };
      return { success: true };
    } catch { return { error: "Error de red" }; }
  }
  return null;
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function ShopifyCustomers() {
  const { customers, favorableBalanceMap, reputationMap } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [resetting, setResetting] = useState<Record<number, boolean>>({});

  const handleResetBalance = (shopifyNumericId: number) => {
    if (!window.confirm("¿Estás seguro de que deseas vaciar el saldo a favor de este cliente? Esta acción no se puede deshacer.")) {
        return;
    }
    submit({ intent: "reset-balance", shopifyNumericId: String(shopifyNumericId) }, { method: "post" });
  };

  const reputationBadge = (label: string | null) => {
    const config: Record<string, { tone: string; emoji: string; text: string }> = {
      excelente: { tone: "success", emoji: "⭐", text: "Excelente" },
      buena: { tone: "info", emoji: "👍", text: "Buena" },
      regular: { tone: "attention", emoji: "⚠️", text: "Regular" },
      mala: { tone: "critical", emoji: "❌", text: "Mala" },
      sin_historial: { tone: "", emoji: "—", text: "Sin historial" },
    };
    const c = config[label ?? "sin_historial"] ?? config["sin_historial"];
    if (!c.tone) return <s-text color="subdued">{c.emoji}</s-text>;
    const badgeTone = (c.tone as any) || "info";
    return <s-badge tone={badgeTone}>{c.emoji} {c.text}</s-badge>;
  };

  const getShopifyNumericId = (gid: string) => {
    const parts = gid.split("/");
    return parseInt(parts[parts.length - 1], 10);
  };

  return (
    <s-page heading="Clientes de Shopify">
      <s-stack gap="base">

        {/* Summary */}
        <s-grid
          gridTemplateColumns="repeat(1, 1fr)"
          gap="small"
          padding="base"
        >
          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Total de clientes registrados</s-text>
                <s-heading>{customers.length}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>
        </s-grid>

        {/* Customers Table */}
        <s-section padding="base" accessibilityLabel="Lista de Clientes Shopify">
          {customers.length === 0 ? (
            <s-text color="subdued">No hay clientes registrados en esta tienda.</s-text>
          ) : (
            <s-table>
              <s-table-header-row>
                <s-table-header listSlot="primary">Nombre</s-table-header>
                <s-table-header>Email</s-table-header>
                <s-table-header>Teléfono</s-table-header>
                <s-table-header format="numeric">Órdenes</s-table-header>
                <s-table-header listSlot="primary" format="numeric">Saldo a Favor</s-table-header>
                <s-table-header>Reputación Crediticia</s-table-header>
                <s-table-header>Acciones</s-table-header>
              </s-table-header-row>

              <s-table-body>
                {customers.map((customer) => {
                  const numericId = getShopifyNumericId(customer.id);
                  const saldo = favorableBalanceMap[numericId];
                  const hasSaldo = saldo != null && saldo > 0;

                  return (
                    <s-table-row key={customer.id}>
                      <s-table-cell>
                        <s-text>{customer.displayName}</s-text>
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
                        {reputationBadge(reputationMap[numericId]?.label ?? null)}
                      </s-table-cell>
                      <s-table-cell>
                        <s-stack direction="inline" gap="small-100" alignItems="center" justifyContent="center">
                          {hasSaldo && (
                            <s-button
                              id={`reset-balance-${numericId}`}
                              tone="critical"
                              onClick={() => handleResetBalance(numericId)}
                              disabled={resetting[numericId]}
                              accessibilityLabel="Vaciar saldo a favor del cliente"
                            >
                              Vaciar Saldo
                            </s-button>
                          )}
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
          <s-text>¿Tienes alguna duda? <s-link href="https://lccopen.tech/contact" target="_blank">Contáctanos</s-link>.</s-text>
        </s-stack>
      </s-stack>
    </s-page>
  );
}
