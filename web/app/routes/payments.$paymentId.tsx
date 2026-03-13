"use client"

import type { LoaderFunctionArgs } from "@remix-run/node"
import { json } from "@remix-run/node"
import { useLoaderData, useNavigate } from "@remix-run/react"
import { Page, Layout, BlockStack, Card, DataTable, Text, Banner, Button, InlineStack } from "@shopify/polaris"
import { createApiClient } from "../lib/api.server"
import { env } from "../env.server"

interface PaymentProduct {
  id: string
  productCode: string
  date: string
  productName: string
  amount: number
  paymentMethod: string
}

interface PaymentDetailData {
  id: string
  paymentNumber: string
  paymentDate: string
  amount: number
  exchangeRate: string
  paymentMethod: string
  notes: string
  customerName: string
  customerEmail: string
  customerPhone: string
  products: PaymentProduct[]
}

export async function loader({ params }: LoaderFunctionArgs) {
  const paymentId = params.paymentId

  if (!paymentId) {
    throw new Response("Payment not found", { status: 404 })
  }

  try {
    const apiClient = createApiClient(env.MERCHANT_ID)

    // In production, fetch from API: await apiClient.getPaymentById(paymentId)
    // For now, using mock data
    const paymentData: PaymentDetailData = {
      id: paymentId,
      paymentNumber: `#${paymentId.padStart(15, "0")}`,
      paymentDate: "20/05/2024",
      amount: 100,
      exchangeRate: "100 bs",
      paymentMethod: "Efectivo",
      notes: "El pago fue realizado en efectivo el mismodia",
      customerName: "Jose Perez",
      customerEmail: "joseperez@example.com",
      customerPhone: "+58414769167",
      products: [
        {
          id: "2050",
          productCode: "#2050",
          date: "20-05-2024",
          productName: "Producto A",
          amount: 64.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2049",
          productCode: "#2049",
          date: "25-05-2024",
          productName: "Producto A",
          amount: 43.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2048",
          productCode: "#2048",
          date: "30-05-2024",
          productName: "Producto A",
          amount: 47.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2047",
          productCode: "#2047",
          date: "05-06-2024",
          productName: "Producto A",
          amount: 83.0,
          paymentMethod: "No realizado",
        },
        {
          id: "2046",
          productCode: "#2046",
          date: "14-06-2024",
          productName: "Producto A",
          amount: 34.0,
          paymentMethod: "No realizado",
        },
      ],
    }

    return json({ payment: paymentData, error: null })
  } catch (error) {
    console.error("[v0] Error loading payment details:", error)

    return json({
      payment: null,
      error: "No se pudo cargar los detalles del pago.",
    })
  }
}

export default function PaymentDetail() {
  const { payment, error } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  if (error || !payment) {
    return (
      <Page title="Error" backAction={{ content: "Volver", onAction: () => navigate(-1) }}>
        <Banner tone="critical" title="Error">
          {error || "Pago no encontrado"}
        </Banner>
      </Page>
    )
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`

  const productRows = payment.products.map((product) => [
    product.productCode,
    product.date,
    <Text key={product.id} as="span">
      {product.productName}
    </Text>,
    formatCurrency(product.amount),
    product.paymentMethod,
  ])

  return (
    <Page title="Detalles de Pago" backAction={{ content: "Volver", onAction: () => navigate(-1) }}>
      <Layout>
        {/* Payment Details and Contact Info */}
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Pago {payment.paymentNumber}
              </Text>

              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" tone="subdued">
                    Fecha de Pago:
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {payment.paymentDate}
                  </Text>
                </InlineStack>

                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" tone="subdued">
                    Monto del Pago:
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {formatCurrency(payment.amount)}
                  </Text>
                </InlineStack>

                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" tone="subdued">
                    Tasa de Cambio:
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {payment.exchangeRate}
                  </Text>
                </InlineStack>

                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd" tone="subdued">
                    Metodo de Pago:
                  </Text>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {payment.paymentMethod}
                  </Text>
                </InlineStack>
              </BlockStack>

              {payment.notes && (
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Nota:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {payment.notes}
                  </Text>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                Informacion de contacto
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  {payment.customerName}
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  {payment.customerEmail}
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  {payment.customerPhone}
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Products Table */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">
                Productos asociados
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "text"]}
                headings={["Codigo de Productos", "Fecha de Pago", "Producto", "Monto", "Metodos de Pago"]}
                rows={productRows}
                footerContent={
                  productRows.length > 0
                    ? `Mostrando ${productRows.length} producto${productRows.length !== 1 ? "s" : ""}`
                    : "No hay productos"
                }
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* WhatsApp Button */}
        <Layout.Section>
          <InlineStack align="end">
            <Button variant="primary" tone="success" onClick={() => console.log("Enviar por WhatsApp")}>
              Enviar por Whatsapp
            </Button>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
