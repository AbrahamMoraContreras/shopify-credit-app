import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Page, Layout, BlockStack, InlineStack, Card, DataTable, Badge, Link, Text, Banner } from "@shopify/polaris"
import { StatsCard } from "../../../components/StatsCard"
import { createApiClient } from "../../lib/api.server"
import { env } from "../../env.server"

interface CustomerCredit {
  id: string
  creditNumber: string
  date: string
  totalAmount: number
  status: "PAGADO" | "NO_PAGADO" | "PARCIALMENTE_PAGADO"
}

interface CustomerDetailData {
  customerName: string
  email: string
  phone: string
  totalDebt: number
  creditLimit: number
  favorBalance: number
  credits: CustomerCredit[]
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const customerName = params.customerName

  if (!customerName) {
    throw new Response("Customer not found", { status: 404 })
  }

  try {
    const apiClient = createApiClient(env.MERCHANT_ID)

    // Fetch credits for this customer
    const creditsResponse = await apiClient.getCredits()

    // Filter credits by customer name (in a real app, this would be a dedicated endpoint)
    const customerCredits = creditsResponse.data.filter(
      (credit) => credit.customerName === decodeURIComponent(customerName),
    )

    // Calculate customer metrics
    const totalDebt = customerCredits.reduce((sum, credit) => sum + credit.balance, 0)
    const creditLimit = 500 // This would come from customer data
    const favorBalance = creditLimit - totalDebt > 0 ? creditLimit - totalDebt : 0

    // Map credits to table format
    const credits: CustomerCredit[] = customerCredits.map((credit) => {
      let status: "PAGADO" | "NO_PAGADO" | "PARCIALMENTE_PAGADO" = "NO_PAGADO"

      if (credit.balance === 0) {
        status = "PAGADO"
      } else if (credit.balance < credit.totalAmount) {
        status = "PARCIALMENTE_PAGADO"
      }

      return {
        id: credit.id,
        creditNumber: `#ORDEN-${credit.id.slice(0, 8)}`,
        date: new Date(credit.createdAt).toLocaleDateString("es-ES"),
        totalAmount: credit.totalAmount,
        status,
      }
    })

    const customerData: CustomerDetailData = {
      customerName: decodeURIComponent(customerName),
      email: "joseperez@gmail.com", // Mock data, would come from API
      phone: "+5804147691688", // Mock data, would come from API
      totalDebt,
      creditLimit,
      favorBalance,
      credits,
    }

    return json({ customer: customerData, error: null })
  } catch (error) {
    console.error("[v0] Error loading customer details:", error)

    return json({
      customer: null,
      error: "No se pudo cargar los datos del cliente.",
    })
  }
}

export default function CustomerDetail() {
  const { customer, error } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  if (error || !customer) {
    return (
      <Page title="Error" backAction={{ content: "Volver", onAction: () => navigate("/") }}>
        <Banner tone="critical" title="Error">
          {error || "Cliente no encontrado"}
        </Banner>
      </Page>
    )
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString("es-ES")}`

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAGADO":
        return <Badge tone="success">Pagado</Badge>
      case "NO_PAGADO":
        return <Badge tone="critical">No pagado</Badge>
      case "PARCIALMENTE_PAGADO":
        return <Badge tone="attention">Parcialmente pagado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const rows = customer.credits.map((credit) => [
    credit.date,
    credit.creditNumber,
    formatCurrency(credit.totalAmount),
    getStatusBadge(credit.status),
    <Link key={credit.id} url={`/orders/${credit.id}`}>
      Ver ordenes
    </Link>,
  ])

  return (
    <Page title={customer.customerName} backAction={{ content: "Volver", onAction: () => navigate("/") }}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Customer Contact Info */}
            <Card>
              <BlockStack gap="200">
                <InlineStack gap="800" wrap={false}>
                  <Text as="p" variant="bodyMd">
                    <strong>Email:</strong> {customer.email}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <strong>Telefono:</strong> {customer.phone}
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Summary Cards */}
            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <StatsCard title="Dinero total en deudas" value={formatCurrency(customer.totalDebt)} />
              </div>
              <div style={{ flex: 1 }}>
                <StatsCard title="Límite de crédito" value={formatCurrency(customer.creditLimit)} />
              </div>
              <div style={{ flex: 1 }}>
                <StatsCard title="Saldo a favor" value={formatCurrency(customer.favorBalance)} />
              </div>
            </InlineStack>

            {/* Orders Table */}
            <Card>
              <DataTable
                columnContentTypes={["text", "text", "numeric", "text", "text"]}
                headings={["Fecha", "Numero de orden", "Monto", "Estatus de pago", "Detalles de Orden"]}
                rows={rows}
                footerContent={
                  rows.length > 0 ? `Mostrando ${rows.length} orden${rows.length !== 1 ? "es" : ""}` : "No hay ordenes"
                }
              />
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
