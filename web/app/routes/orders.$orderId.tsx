"use client"

import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import {
  Page,
  Layout,
  BlockStack,
  InlineStack,
  Card,
  DataTable,
  Link,
  Text,
  Banner,
  Button,
  Checkbox,
} from "@shopify/polaris"
import { useState } from "react"
import { StatsCard } from "../../components/StatsCard"
import { createApiClient } from "../lib/api.server"
import { env } from "../env.server"

interface Payment {
  id: string
  date: string
  referenceNumber: string
  amount: number
}

interface Product {
  id: string
  productCode: string
  date: string
  productName: string
  amount: number
  paymentMethod: string
}

interface OrderDetailData {
  customerName: string
  orderNumber: string
  amountPaid: number
  totalAmount: number
  currentDebt: number
  payments: Payment[]
  products: Product[]
}

export async function loader({ params }: LoaderFunctionArgs) {
  const orderId = params.orderId

  if (!orderId) {
    throw new Response("Order not found", { status: 404 })
  }

  try {
    const apiClient = createApiClient(env.MERCHANT_ID)

    // Fetch credit details
    const credit = await apiClient.getCreditById(orderId)

    // Mock data structure - in real app, this would come from API
    const orderData: OrderDetailData = {
      customerName: credit.customerName,
      orderNumber: `#${orderId.slice(0, 12)}`,
      amountPaid: credit.totalAmount - credit.balance,
      totalAmount: credit.totalAmount,
      currentDebt: credit.balance,
      payments: [
        {
          id: "1",
          date: "20-05-2024",
          referenceNumber: "0000000021324",
          amount: -40.0,
        },
        {
          id: "2",
          date: "20-05-2024",
          referenceNumber: "0000000021324",
          amount: -160.0,
        },
      ],
      products: [
        {
          id: "2050",
          productCode: "#2050",
          date: "20-05-2024",
          productName: "Producto A",
          amount: 3648.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2049",
          productCode: "#2049",
          date: "25-05-2024",
          productName: "Producto A",
          amount: 8343.0,
          paymentMethod: "Efectivo",
        },
        {
          id: "2048",
          productCode: "#2048",
          date: "01-06-2024",
          productName: "Producto A",
          amount: 4747.0,
          paymentMethod: "Tarjeta Mercantil",
        },
        {
          id: "2047",
          productCode: "#2047",
          date: "05-06-2024",
          productName: "Producto A",
          amount: 9983.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2046",
          productCode: "#2046",
          date: "05-06-2024",
          productName: "Producto A",
          amount: 2634.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2045",
          productCode: "#2045",
          date: "07-06-2024",
          productName: "Producto A",
          amount: 5829.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2044",
          productCode: "#2044",
          date: "07-06-2024",
          productName: "Producto A",
          amount: 825.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2043",
          productCode: "#2043",
          date: "08-06-2024",
          productName: "Producto A",
          amount: 7275.0,
          paymentMethod: "No realizado",
        },
      ],
    }

    return json({ order: orderData, error: null })
  } catch (error) {
    console.error("[v0] Error loading order details:", error)

    return json({
      order: null,
      error: "No se pudo cargar los detalles de la orden.",
    })
  }
}

export default function OrderDetail() {
  const { order, error } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  if (error || !order) {
    return (
      <Page title="Error" backAction={{ content: "Volver", onAction: () => navigate(-1) }}>
        <Banner tone="critical" title="Error">
          {error || "Orden no encontrada"}
        </Banner>
      </Page>
    )
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`

  const handleProductSelect = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === order.products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(order.products.map((p) => p.id))
    }
  }

  const paymentRows = order.payments.map((payment) => [
    payment.date,
    payment.referenceNumber,
    formatCurrency(payment.amount),
    <Link key={payment.id} url={`/payments/${payment.id}`}>
      Ver Pago
    </Link>,
  ])

  const productRows = order.products.map((product) => [
    <Checkbox
      key={product.id}
      label=""
      checked={selectedProducts.includes(product.id)}
      onChange={() => handleProductSelect(product.id)}
    />,
    product.productCode,
    product.date,
    <Text key={product.id} as="span">
      {product.productName}
    </Text>,
    formatCurrency(product.amount),
    product.paymentMethod,
  ])

  return (
    <Page
      title={order.customerName}
      backAction={{ content: "Volver", onAction: () => navigate(-1) }}
      primaryAction={
        <Button variant="primary" onClick={() => navigate("/payments/new")}>
          Registrar Pago
        </Button>
      }
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Order Header */}
            <Card>
              <Text as="h2" variant="headingMd">
                Detalles de orden
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {order.orderNumber}
              </Text>
            </Card>

            {/* Summary Cards */}
            <InlineStack gap="400">
              <div style={{ flex: 1 }}>
                <StatsCard title="Monto pagado" value={formatCurrency(order.amountPaid)} />
              </div>
              <div style={{ flex: 1 }}>
                <StatsCard title="Monto total" value={formatCurrency(order.totalAmount)} />
              </div>
              <div style={{ flex: 1 }}>
                <StatsCard title="Deuda actual" value={formatCurrency(order.currentDebt)} />
              </div>
            </InlineStack>

            {/* Payments List */}
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Lista de Pagos
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "numeric", "text"]}
                  headings={["Fecha", "Numero de referencia", "Monto del Pago", "Detalles de Pago"]}
                  rows={paymentRows}
                  footerContent={
                    paymentRows.length > 0
                      ? `Mostrando ${paymentRows.length} pago${paymentRows.length !== 1 ? "s" : ""}`
                      : "No hay pagos"
                  }
                />
              </BlockStack>
            </Card>

            {/* Products List */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">
                    Lista de Productos
                  </Text>
                  <Checkbox
                    label="Seleccionar todos"
                    checked={selectedProducts.length === order.products.length}
                    onChange={handleSelectAllProducts}
                  />
                </InlineStack>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "numeric", "text"]}
                  headings={["", "Codigo de Producto", "Fecha", "Productos", "Monto", "Metodo de Pago"]}
                  rows={productRows}
                  footerContent={
                    productRows.length > 0
                      ? `Mostrando ${productRows.length} producto${productRows.length !== 1 ? "s" : ""}`
                      : "No hay productos"
                  }
                />
              </BlockStack>
            </Card>

            {/* WhatsApp Button */}
            <InlineStack align="end">
              <Button variant="primary" tone="success" onClick={() => console.log("Enviar por WhatsApp")}>
                Enviar por Whatsapp
              </Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
