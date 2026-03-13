"use client"

import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import { json, redirect } from "@remix-run/node"
import { useLoaderData, useNavigate, Form, useNavigation } from "@remix-run/react"
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  DataTable,
  BlockStack,
  InlineStack,
  Text,
  Banner,
} from "@shopify/polaris"
import { useState, useCallback } from "react"

interface Customer {
  name: string
  email: string
  phone: string
}

interface Installment {
  id: string
  productCode: string
  paymentDate: string
  productName: string
  amount: number
  paymentMethod: string
}

interface LoaderData {
  customers: Customer[]
  installments: Installment[]
  error: string | null
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const selectedCustomer = url.searchParams.get("customer")

  try {
    // Mock customers data - in production, fetch from API
    const customers: Customer[] = [
      { name: "Jose Perez", email: "joseperez@example.com", phone: "+58414769167" },
      { name: "Sofia Herrera", email: "sofia@example.com", phone: "+58412345678" },
      { name: "Mateo Vargas", email: "mateo@example.com", phone: "+58414567890" },
    ]

    // Mock installments data - in production, fetch from API based on customer
    const installments: Installment[] = [
      {
        id: "2050",
        productCode: "#2050",
        paymentDate: "20-05-2024",
        productName: "Producto A",
        amount: 64.0,
        paymentMethod: "No realizado",
      },
      {
        id: "2049",
        productCode: "#2049",
        paymentDate: "25-05-2024",
        productName: "Producto A",
        amount: 43.0,
        paymentMethod: "No realizado",
      },
      {
        id: "2048",
        productCode: "#2048",
        paymentDate: "30-05-2024",
        productName: "Producto A",
        amount: 47.0,
        paymentMethod: "No realizado",
      },
      {
        id: "2047",
        productCode: "#2047",
        paymentDate: "05-06-2024",
        productName: "Producto A",
        amount: 83.0,
        paymentMethod: "No realizado",
      },
      {
        id: "2046",
        productCode: "#2046",
        paymentDate: "14-06-2024",
        productName: "Producto A",
        amount: 34.0,
        paymentMethod: "No realizado",
      },
    ]

    return json<LoaderData>({ customers, installments, error: null })
  } catch (error) {
    console.error("[v0] Error loading payment form data:", error)
    return json<LoaderData>({
      customers: [],
      installments: [],
      error: "No se pudo cargar los datos del formulario.",
    })
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()

  const paymentData = {
    customer: formData.get("customer"),
    paymentDate: formData.get("paymentDate"),
    exchangeRate: formData.get("exchangeRate"),
    paymentMethod: formData.get("paymentMethod"),
    amount: formData.get("amount"),
    referenceNumber: formData.get("referenceNumber"),
    notes: formData.get("notes"),
    autoSelectOrders: formData.get("autoSelectOrders") === "true",
    selectedInstallments: formData.get("selectedInstallments"),
  }

  console.log("[v0] Payment data to submit:", paymentData)

  try {
    // Here you would call the API to create the payment
    // const apiClient = createApiClient(env.MERCHANT_ID)
    // await apiClient.createPayment(paymentData)

    // For now, just redirect back to home
    return redirect("/?payment=success")
  } catch (error) {
    console.error("[v0] Error creating payment:", error)
    return json({ error: "No se pudo registrar el pago." }, { status: 500 })
  }
}

export default function RegisterPayment() {
  const { customers, installments, error } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [exchangeRate, setExchangeRate] = useState("100")
  const [paymentMethod, setPaymentMethod] = useState("dolares-efectivo")
  const [amount, setAmount] = useState("100")
  const [referenceNumber, setReferenceNumber] = useState("000045568345")
  const [notes, setNotes] = useState("")
  const [autoSelectOrders, setAutoSelectOrders] = useState(false)
  const [selectedInstallments, setSelectedInstallments] = useState<string[]>([])

  // Customer options for select
  const customerOptions = [
    { label: "Seleccionar cliente", value: "" },
    ...customers.map((customer) => ({
      label: customer.name,
      value: customer.name,
    })),
  ]

  // Payment method options
  const paymentMethodOptions = [
    { label: "Dolares en efectivo", value: "dolares-efectivo" },
    { label: "Transferencia bancaria", value: "transferencia" },
    { label: "Tarjeta de crédito", value: "tarjeta-credito" },
    { label: "Tarjeta de débito", value: "tarjeta-debito" },
  ]

  // Get selected customer details
  const customerDetails = customers.find((c) => c.name === selectedCustomer)

  // Calculate totals
  const selectedInstallmentsData = installments.filter((i) => selectedInstallments.includes(i.id))
  const totalAmount = selectedInstallmentsData.reduce((sum, i) => sum + i.amount, 0)
  const amountToPay = Number.parseFloat(amount) || 0
  const pendingBalance = totalAmount - amountToPay

  // Handle installment selection
  const handleInstallmentSelect = useCallback((installmentId: string) => {
    setSelectedInstallments((prev) =>
      prev.includes(installmentId) ? prev.filter((id) => id !== installmentId) : [...prev, installmentId],
    )
  }, [])

  const handleSelectAllInstallments = useCallback(() => {
    if (selectedInstallments.length === installments.length) {
      setSelectedInstallments([])
    } else {
      setSelectedInstallments(installments.map((i) => i.id))
    }
  }, [installments, selectedInstallments.length])

  // Clear form
  const handleClearForm = useCallback(() => {
    setSelectedCustomer("")
    setPaymentDate("")
    setExchangeRate("100")
    setPaymentMethod("dolares-efectivo")
    setAmount("100")
    setReferenceNumber("")
    setNotes("")
    setAutoSelectOrders(false)
    setSelectedInstallments([])
  }, [])

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

  // Table rows
  const installmentRows = installments.map((installment) => [
    <Checkbox
      key={installment.id}
      label=""
      checked={selectedInstallments.includes(installment.id)}
      onChange={() => handleInstallmentSelect(installment.id)}
    />,
    installment.productCode,
    installment.paymentDate,
    <Text key={installment.id} as="span">
      {installment.productName}
    </Text>,
    formatCurrency(installment.amount),
    installment.paymentMethod,
  ])

  if (error) {
    return (
      <Page title="Error" backAction={{ content: "Volver", onAction: () => navigate(-1) }}>
        <Banner tone="critical" title="Error">
          {error}
        </Banner>
      </Page>
    )
  }

  return (
    <Page
      title="Registrar pago"
      backAction={{ content: "Volver", onAction: () => navigate(-1) }}
      secondaryActions={[{ content: "Limpiar todo", onAction: handleClearForm }]}
      primaryAction={{
        content: "Confirmar pago",
        loading: isSubmitting,
        disabled: !selectedCustomer || selectedInstallments.length === 0,
        onAction: () => {
          // Submit form programmatically
          const form = document.getElementById("payment-form") as HTMLFormElement
          form?.requestSubmit()
        },
      }}
    >
      <Form method="post" id="payment-form">
        <Layout>
          {/* Main Form Section */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <FormLayout>
                  <Select
                    label="Cliente seleccionado"
                    options={customerOptions}
                    value={selectedCustomer}
                    onChange={setSelectedCustomer}
                    name="customer"
                  />

                  <FormLayout.Group>
                    <TextField
                      label="Fecha de pago"
                      type="date"
                      value={paymentDate}
                      onChange={setPaymentDate}
                      autoComplete="off"
                      name="paymentDate"
                      placeholder="DD/MM/YYYY"
                    />

                    <TextField
                      label="Tasa de cambio (BS)"
                      type="number"
                      value={exchangeRate}
                      onChange={setExchangeRate}
                      autoComplete="off"
                      name="exchangeRate"
                      suffix="Bs"
                    />
                  </FormLayout.Group>

                  <FormLayout.Group>
                    <Select
                      label="Metodo de pago"
                      options={paymentMethodOptions}
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      name="paymentMethod"
                    />
                  </FormLayout.Group>

                  <FormLayout.Group>
                    <TextField
                      label="Monto a pagar (USD)"
                      type="number"
                      value={amount}
                      onChange={setAmount}
                      autoComplete="off"
                      name="amount"
                      prefix="$"
                    />

                    <TextField
                      label="Numero de referencia"
                      value={referenceNumber}
                      onChange={setReferenceNumber}
                      autoComplete="off"
                      name="referenceNumber"
                    />
                  </FormLayout.Group>

                  <TextField
                    label="Notas"
                    value={notes}
                    onChange={setNotes}
                    autoComplete="off"
                    multiline={4}
                    name="notes"
                  />

                  <Checkbox
                    label="Seleccionar ordenes automaticamente"
                    checked={autoSelectOrders}
                    onChange={setAutoSelectOrders}
                    name="autoSelectOrders"
                  />
                </FormLayout>
              </Card>
            </BlockStack>

            <input type="hidden" name="selectedInstallments" value={JSON.stringify(selectedInstallments)} />
          </Layout.Section>

          {/* Contact Information Sidebar */}
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Informacion de contacto
                </Text>
                {customerDetails ? (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {customerDetails.name}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {customerDetails.email}
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {customerDetails.phone}
                    </Text>
                  </BlockStack>
                ) : (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Selecciona un cliente para ver su información
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Installments Table */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">
                    Cuotas disponibles
                  </Text>
                  <Checkbox
                    label="Seleccionar todas"
                    checked={selectedInstallments.length === installments.length && installments.length > 0}
                    onChange={handleSelectAllInstallments}
                  />
                </InlineStack>

                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "numeric", "text"]}
                  headings={["", "Codigo de Productos", "Fecha de Pago", "Producto", "Monto", "Metodos de Pago"]}
                  rows={installmentRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Summary Section */}
          {selectedInstallments.length > 0 && (
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">
                      Cuotas seleccionadas:
                    </Text>
                    <BlockStack gap="100">
                      {selectedInstallmentsData.map((inst) => (
                        <InlineStack key={inst.id} align="space-between" blockAlign="center">
                          <Text as="span" variant="bodyMd">
                            {inst.productCode}:
                          </Text>
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {formatCurrency(inst.amount)}
                          </Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  </InlineStack>

                  <div style={{ borderTop: "1px solid #e1e3e5", paddingTop: "12px" }}>
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Monto Total:
                      </Text>
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        {formatCurrency(totalAmount)}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Monto a pagar:
                      </Text>
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        {formatCurrency(amountToPay)}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        Saldo pendiente:
                      </Text>
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        {formatCurrency(pendingBalance)}
                      </Text>
                    </InlineStack>
                  </div>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </Form>
    </Page>
  )
}
