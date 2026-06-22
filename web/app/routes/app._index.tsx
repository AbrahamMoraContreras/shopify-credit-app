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
            <s-heading>
              Guía Rápida de la Aplicación
            </s-heading>
            <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
              <s-box>
                <s-text type="strong">CREAR UN CRÉDITO: PRIMEROS PASOS</s-text>
                  <s-unordered-list>
                    <s-list-item>1. Ve a "Registrar Crédito". Selecciona uno de los clientes registrados en tu comercio de Shopify y empieza una nueva operación crediticia.</s-list-item> 
                    <s-list-item>2. En la tabla inferior de productos, selecciona los que el cliente desea. </s-list-item>
                    <s-list-item>3. Selecciona la periodicidad: Mensual, quincenal oi fiado, y planifica los pago en múltiples cuotas si es necesario.</s-list-item>
                    <s-list-item>4. Verifica que toda la información sea la correcta, y finaliza la creación del crédito.</s-list-item>
                  </s-unordered-list>
              </s-box>
              <s-box>
                <s-text type="strong">REGISTRAR COBROS: FORMA DIRECTA</s-text>
                  <s-unordered-list>
                    <s-list-item>1- Ve a "Registrar Cobro". Selecciona el clientes.</s-list-item>
                    <s-list-item>2. Selecciona el método de pago, la cantidad en divisas y el código de referencia asociado al pago del cliente.</s-list-item> 
                    <s-list-item>3. En la parte inferior, selecciona las cuotas que el cliente desea pagar.</s-list-item>
                    <s-list-item>IMPORTANTE: Este método se usa en caso de que el clinete pague de forma directa sin usar el recordatorio por e-mail.</s-list-item>
                  </s-unordered-list>
              </s-box>
              <s-box>
                <s-text type="strong">REGISTRAR COBROS: USANDO EL RECORDATORIO POR E.MAIL</s-text>
                  <s-unordered-list>
                    <s-list-item>1- Ve a "Cobros Esperados" o a "Detalles de Crédito". Oprime el botón de "Enviar Recordatorio". </s-list-item>
                    <s-list-item>2. El cliente recibirá un e-mail con un link de pago. Deberá seleccionar el método de pago preferido, y llenar un formulario con la información de su pago. </s-list-item>
                    <s-list-item>3. Al completar el formulario, la información del cobro llegará automáticamente a la app en Shopify.</s-list-item>
                    <s-list-item>4. Contrasta la información del formulario con los estados financieros del comercio. Finalmente desde "Cobros", aprueba o rechaza el cobro.</s-list-item>
                  </s-unordered-list>

              </s-box>
              <s-box>
                <s-text type="strong">CONFIGURANDO LA INFORMACIÓN DE COBRO</s-text>
                <s-paragraph color="subdued">
                  Desde "Configuración", edita los datos de los métodos de pago y los datos a los cuales los clientes realizarán los cobros.
                </s-paragraph>
                <s-paragraph color="subdued">
                  Se aceptan:
                </s-paragraph>
                  <s-unordered-list>
                    <s-list-item>Pago Movil (Bancos venezolanos)</s-list-item>
                    <s-list-item>Transferencia Bancaria (Bancos venezolanos)</s-list-item>
                    <s-list-item>Zinli</s-list-item>
                    <s-list-item>Zelle</s-list-item>
                    <s-list-item>Binance/USDT</s-list-item>
                    <s-list-item>Débito (POS)</s-list-item>
                  </s-unordered-list>

              </s-box>
              <s-box>
                <s-text type="strong">MONITOREO DE CRÉDITOS</s-text>
                <s-paragraph color="subdued">
                  Desde "Créditos", "Cobros", "Cobros Esperados" y las páginas de "Detalles de Crédito" y "Detalles de Cobro" se puede monitorear los estatus de cada operación crediticia activa.
                </s-paragraph>
                <s-paragraph color="subdued">
                  La reputación crediticia de cada cliente se actualizará automáticamente dependiendo del promedio de créditos y cobros completados por cada cliente.
                </s-paragraph>
              </s-box>
            </s-grid>
          </s-section>
        )}

        {/* Summary Cards */}
        <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="small" padding="base">
          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Créditos Activos</s-text>
                <s-heading>{dashboardData?.credits?.active ?? 0}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Créditos Finalizados</s-text>
                <s-heading>{dashboardData?.credits?.paid ?? 0}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Cobros Esperados</s-text>
                <s-heading>{dashboardData?.payments?.pending_review ?? 0}</s-heading>
              </s-stack>
            </s-section>
          </s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-section>
              <s-stack alignItems="center" gap="small-200">
                <s-text color="subdued">Cobros No Completados</s-text>
                <s-heading>{dashboardData?.payments?.not_paid ?? 0}</s-heading>
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
        <s-stack padding="base" alignItems="center">
          <s-text color="subdued">
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
