'use client'

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { useOutletContext } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";

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
  try {
    const merchantRes = await fetch("http://localhost:8000/api/merchants/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_domain: session.shop }),
    });
    if (merchantRes.ok) {
      const merchant = await merchantRes.json();
      const backendRes = await fetch("http://localhost:8000/api/customers?limit=200", {
        headers: { "X-Merchant-ID": merchant.id },
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

export default function ShopifyCustomers() {
  const { customers, favorableBalanceMap, reputationMap } = useLoaderData<typeof loader>();
  const { merchantId } = useOutletContext<{ merchantId: string }>();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState<Record<number, boolean>>({});

  const handleResetBalance = async (shopifyNumericId: number) => {
    if (!window.confirm("¿Estás seguro de que deseas vaciar el saldo a favor de este cliente? Esta acción no se puede deshacer.")) {
        return;
    }
    setResetting(s => ({ ...s, [shopifyNumericId]: true }));
    try {
      await fetch(`http://localhost:8000/api/customers/shopify/${shopifyNumericId}/reset-balance`, {
        method: "PATCH",
        headers: { "X-Merchant-ID": String(merchantId) },
      });
      navigate(".", { replace: true });
    } finally {
      setResetting(s => ({ ...s, [shopifyNumericId]: false }));
    }
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
    return <s-badge tone={c.tone}>{c.emoji} {c.text}</s-badge>;
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
                          <s-stack gap="small-100" direction="horizontal" alignItems="center">
                            <s-badge tone="success">${saldo.toFixed(2)}</s-badge>
                            <s-button
                              id={`reset-balance-${numericId}`}
                              size="slim"
                              tone="critical"
                              onClick={() => handleResetBalance(numericId)}
                              disabled={resetting[numericId]}
                            >
                              Vaciar
                            </s-button>
                          </s-stack>
                        ) : (
                          <s-text color="subdued">—</s-text>
                        )}
                      </s-table-cell>
                      <s-table-cell>
                        {reputationBadge(reputationMap[numericId]?.label ?? null)}
                      </s-table-cell>
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>
          )}
        </s-section>

        {/* Footer */}
        <s-stack padding="base" alignItems="center">
          <s-text>
            ¿Tienes alguna duda? <s-link href="">Contáctanos</s-link>.
          </s-text>
        </s-stack>
      </s-stack>
    </s-page>
  );
}
