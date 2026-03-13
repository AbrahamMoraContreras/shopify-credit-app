import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData, Link } from "@remix-run/react"
import { Page, Card, DataTable, Button } from "@shopify/polaris"
import { ShopifyFrame } from "../../components/ShopifyFrame"
import { createApiClient } from "../lib/api.server"

interface PaymentHistory {
  id: string
  customerName: string
  amountReceived: number
  affectedOrders: number
  paymentDate: string
}

export async function loader({ request }: LoaderFunctionArgs) {
  const apiClient = createApiClient()

  // Mock data - replace with real API call when backend is ready
  const mockPayments: PaymentHistory[] = [
    {
      id: "PAGO-20240528-001",
      customerName: "Pedro A",
      amountReceived: 100,
      paymentDate: "01-05-2025",
      affectedOrders: 2,
    },
    {
      id: "PAGO-20240528-002",
      customerName: "Pedro B",
      amountReceived: 200,
      paymentDate: "01-05-2025",
      affectedOrders: 1,
    },
    {
      id: "PAGO-20240528-0011",
      customerName: "Pedro C",
      amountReceived: 50,
      paymentDate: "01-05-2025",
      affectedOrders: 1,
    },
    {
      id: "PAGO-20240528-003",
      customerName: "Pedro D",
      amountReceived: 75,
      paymentDate: "01-05-2025",
      affectedOrders: 3,
    },
    {
      id: "PAGO-20240528-004",
      customerName: "Pedro E",
      amountReceived: 46,
      paymentDate: "01-05-2025",
      affectedOrders: 1,
    },
    {
      id: "PAGO-20240528-005",
      customerName: "Pedro F",
      amountReceived: 36,
      paymentDate: "01-05-2025",
      affectedOrders: 2,
    },
    {
      id: "PAGO-20240528-006",
      customerName: "Pedro G",
      amountReceived: 40,
      paymentDate: "01-05-2025",
      affectedOrders: 1,
    },
    {
      id: "PAGO-20240528-007",
      customerName: "Pedro H",
      amountReceived: 80,
      paymentDate: "01-05-2025",
      affectedOrders: 2,
    },
    {
      id: "PAGO-20240528-008",
      customerName: "Pedro I",
      amountReceived: 70,
      paymentDate: "01-05-2025",
      affectedOrders: 1,
    },
    {
      id: "PAGO-20240528-009",
      customerName: "Pedro J",
      amountReceived: 30,
      paymentDate: "01-05-2025",
      affectedOrders: 1,
    },
  ]

  return json({ payments: mockPayments })
}

export default function PaymentHistoryPage() {
  const { payments } = useLoaderData<typeof loader>()

  const rows = payments.map((payment) => [
    payment.id,
    payment.customerName,
    payment.amountReceived,
    <Link key={payment.id} to={`/payments/${payment.id}`} style={{ color: "#2c6ecb", textDecoration: "underline" }}>
      Ver detalles
    </Link>,
    payment.paymentDate,
  ])

  return (
    <ShopifyFrame>
      <Page
        title="Historial de pagos"
        primaryAction={
          <Button variant="primary" url="/payments/new">
            Registrar Pago
          </Button>
        }
      >
        <Card padding="0">
          <DataTable
            columnContentTypes={["text", "text", "numeric", "text", "text"]}
            headings={["ID del Pago", "Cliente", "Monto recibido", "Ordenes afectadas", "Fecha del pago"]}
            rows={rows}
          />
        </Card>
      </Page>
    </ShopifyFrame>
  )
}
