import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Page, Layout, BlockStack, InlineStack, Banner } from "@shopify/polaris"
import { StatsCard } from "../../components/StatsCard"
import { CustomerTable } from "../../components/CustomerTable"
import { createApiClient } from "../lib/api.server"
import { env } from "../env.server"

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const apiClient = createApiClient(env.MERCHANT_ID)

    const dashboard = await apiClient.getDashboard()

    return json({
      totalDebt: dashboard.totalDebt,
      customersWithDebt: dashboard.customersWithDebt,
      customers: dashboard.customers || [],
      error: null,
    })
  } catch (error) {
    console.error("[v0] Error loading dashboard:", error)

    return json({
      totalDebt: 0,
      customersWithDebt: 0,
      customers: [],
      error: "No se pudo cargar los datos. Por favor verifica la configuración del API.",
    })
  }
}

export default function Index() {
  const { totalDebt, customersWithDebt, customers, error } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  const handleViewDetails = (customerName: string) => {
    navigate(`/customers/${encodeURIComponent(customerName)}`)
  }

  return (
    <Page
      title="Gestión de cobro y crédito"
      primaryAction={{
        content: "Seleccionar tasa de cambio",
        onAction: () => console.log("[v0] Seleccionar tasa de cambio clicked"),
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {error && (
              <Banner tone="warning" title="Advertencia">
                {error}
              </Banner>
            )}

            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <StatsCard title="Dinero total en deudas" value={`$${totalDebt}`} />
              </div>
              <div style={{ flex: 1 }}>
                <StatsCard title="Clientes con deuda" value={customersWithDebt} />
              </div>
            </InlineStack>

            <CustomerTable customers={customers} onViewDetails={handleViewDetails} />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
