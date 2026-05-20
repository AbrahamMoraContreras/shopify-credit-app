import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getAccessTokenForShop } from "../lib/auth.server";
import { useState } from "react";

// Define the shape of our data
interface CustomerSummary {
  id: number;
  name: string;
  pendingOrders: number;
  pendingDebt: number;
  balance: number;
}

interface DashboardData {
  amounts: {
    total_pending: number;
  };
  customers: {
    clients_with_debt: number;
  };
  customers_summary: CustomerSummary[];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  let dashboardData: DashboardData | null = null;
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

  try {
    // Request a token directly using the shop domain securely authenticated by Shopify session
    let accessToken = await getAccessTokenForShop(session.shop);

    if (accessToken) {
      // Fetch the Dashboard snapshot using Bearer token
      const dashRes = await fetch(`${BACKEND_URL}/api/dashboard`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (dashRes.ok) {
        dashboardData = await dashRes.json();

        // Ping audit silently
        fetch(`${BACKEND_URL}/api/audit/login`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }).catch((ignored) => {});
      } else {
        console.error("[Home Loader] Dashboard API error:", dashRes.status);
      }
    } else {
      console.error(
        "[Home Loader] Critical: Could not retrieve an access token for Home.",
      );
    }
  } catch (err) {
    console.error("[Home Loader] Fetch exception:", err);
  }

  return { dashboardData };
};

export const headers = () => ({
  "Cache-Control": "no-cache, no-store, must-revalidate",
});

export default function Home() {
  const { dashboardData } = useLoaderData<typeof loader>();
  const [showManual, setShowManual] = useState(false);

  // Use dashboard data or fallback defaults
  const totalDebt = dashboardData?.amounts?.total_pending || 0;
  const clientsWithDebt = dashboardData?.customers?.clients_with_debt || 0;
  const customers = dashboardData?.customers_summary || [];

  const totalPendingOrders = customers.reduce(
    (sum, c) => sum + c.pendingOrders,
    0,
  );
  const totalBalance = customers.reduce((sum, c) => sum + c.balance, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <s-page heading="FÍAME - App">
      <s-stack gap="base">
        {/* User Manual Toggle */}
        <s-box paddingBlockEnd="none">
          <s-button
            icon="info"
            onClick={() => setShowManual((prev: boolean) => !prev)}
            tone="auto"
          >
            {showManual ? "Ocultar Manual de Uso" : "Mostrar Manual de Uso"}
          </s-button>
        </s-box>

        {showManual && (
          <s-section padding="base" accessibilityLabel="Manual de Usuario">
            <s-heading paddingBlockEnd="base">
              Guía Rápida de la Aplicación
            </s-heading>
            <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
              <s-box>
                <s-text type="strong">1. Gestión de Créditos</s-text>
                <s-text color="subdued">
                  Busca clientes de Shopify para crearles créditos. Ingresa el
                  concepto, selecciona las compras que fían y planifica el pago
                  en múltiples cuotas.
                </s-text>
              </s-box>
              <s-box>
                <s-text type="strong">2. Registro de Pagos</s-text>
                <s-text color="subdued">
                  Abona a un crédito existente registrando el método de pago
                  (Efectivo, Zelle, Pago Móvil), añadiendo referencias o
                  procesando reportes web de clientes.
                </s-text>
              </s-box>
              <s-box>
                <s-text type="strong">3. Pagos Esperados</s-text>
                <s-text color="subdued">
                  Haz seguimiento de las próximas cuotas a vencer en la pestaña
                  respectiva. Manda recordatorios al cliente para agilizar la
                  cobranza.
                </s-text>
              </s-box>
              <s-box>
                <s-text type="strong">4. Clientes y Documentos</s-text>
                <s-text color="subdued">
                  Inspecciona la reputación de tu cliente. Si abonan demás,
                  quedará guardado como Saldo a Favor. Completa sus tipos
                  documentos (V, J, E) desde sus perfiles.
                </s-text>
              </s-box>
            </s-grid>
          </s-section>
        )}

        {/* Summary Cards */}
        <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="small" padding="base">
          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Dinero total en deudas</s-text>
                <s-heading>{formatCurrency(totalDebt)}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Clientes con deuda</s-text>
                <s-heading>{clientsWithDebt}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>
        </s-grid>

        {/* Customers Table */}
        <s-section padding="base" accessibilityLabel="Lista de Clientes">
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Cliente</s-table-header>
              <s-table-header format="numeric">
                Ordenes Pendientes
              </s-table-header>
              <s-table-header format="numeric">Deuda Pendiente</s-table-header>
              <s-table-header format="numeric">Saldo a favor</s-table-header>
              <s-table-header listSlot="secondary">Detalles</s-table-header>
            </s-table-header-row>

            <s-table-body>
              {/* Totals Row */}
              <s-table-row>
                <s-table-cell>
                  <s-text font-weight="bold">Totales</s-text>
                </s-table-cell>
                <s-table-cell>
                  <s-text font-weight="bold">{totalPendingOrders}</s-text>
                </s-table-cell>
                <s-table-cell>
                  <s-text font-weight="bold">
                    {formatCurrency(totalDebt)}
                  </s-text>
                </s-table-cell>
                <s-table-cell>
                  <s-text font-weight="bold">
                    {formatCurrency(totalBalance)}
                  </s-text>
                </s-table-cell>
                <s-table-cell></s-table-cell>
              </s-table-row>

              {/* Customer Rows */}
              {customers.length > 0 ? (
                customers.map((customer, index) => (
                  <s-table-row key={customer.id || index}>
                    <s-table-cell>
                      <s-text>{customer.name}</s-text>
                    </s-table-cell>
                    <s-table-cell>{customer.pendingOrders}</s-table-cell>
                    <s-table-cell>
                      {formatCurrency(customer.pendingDebt)}
                    </s-table-cell>
                    <s-table-cell>
                      {formatCurrency(customer.balance)}
                    </s-table-cell>
                    <s-table-cell>
                      <s-link
                        href={`/app/customer_detail?name=${encodeURIComponent(customer.name)}`}
                      >
                        <s-text color="subdued">Ver órdenes</s-text>
                      </s-link>
                    </s-table-cell>
                  </s-table-row>
                ))
              ) : (
                <s-table-row>
                  <s-table-cell>
                    No hay clientes con deudas activas o saldos a favor en este
                    momento.
                  </s-table-cell>
                  <s-table-cell></s-table-cell>
                  <s-table-cell></s-table-cell>
                  <s-table-cell></s-table-cell>
                  <s-table-cell></s-table-cell>
                </s-table-row>
              )}
            </s-table-body>
          </s-table>
        </s-section>

        {/* Footer */}
        <s-stack padding="base" alignItems="center" gap="tight">
          <s-text color="subdued" variant="bodySm">
            Desarrollado por Opentech LCC
          </s-text>
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
