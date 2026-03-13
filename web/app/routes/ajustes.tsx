"use client"

import { json, type LoaderFunctionArgs } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { Page, Layout, Card, Text, Button, TextField, BlockStack, InlineStack, Box } from "@shopify/polaris"
import { ShopifyFrame } from "../../components/ShopifyFrame"
import { useState } from "react"

interface SettingsData {
  whatsapp: {
    connected: boolean
    lastSync: string | null
  }
  creditLimit: {
    value: string
    lastSync: string | null
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: Fetch real settings from API
  const settings: SettingsData = {
    whatsapp: {
      connected: false,
      lastSync: "12/08/2025 15:27",
    },
    creditLimit: {
      value: "100",
      lastSync: "11/08/2025 20:03",
    },
  }

  return json({ settings })
}

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>()
  const [creditLimit, setCreditLimit] = useState(settings.creditLimit.value)
  const [isSaving, setIsSaving] = useState(false)

  const handleWhatsAppConnect = async () => {
    console.log("[v0] Connecting to WhatsApp...")
    // TODO: Implement WhatsApp connection logic
  }

  const handleSaveCreditLimit = async () => {
    setIsSaving(true)
    console.log("[v0] Saving credit limit:", creditLimit)
    // TODO: Implement save credit limit logic
    setTimeout(() => setIsSaving(false), 1000)
  }

  return (
    <ShopifyFrame>
      <Page title="Gestion de cobro y credito">
        <Layout>
          <Layout.Section>
            <BlockStack gap="600">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Configuraciones de la aplicacion
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Aqui se podrá realizar las configuraciones para ajustar el cobro y credito
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        WhatsApp
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Sincroniza la configuración de tu tienda (mercados, catálogos).
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Última sincronización: {settings.whatsapp.lastSync}
                      </Text>
                    </BlockStack>
                    <Button onClick={handleWhatsAppConnect}>Conectarse</Button>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Limite Crediticio para los clientes
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Sincroniza todos los productos publicados desde Shopify.
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Última sincronización: {settings.creditLimit.lastSync}
                      </Text>
                    </BlockStack>
                    <Box minWidth="120px">
                      <TextField
                        label=""
                        value={creditLimit}
                        onChange={setCreditLimit}
                        suffix="Bs"
                        type="number"
                        autoComplete="off"
                      />
                    </Box>
                  </InlineStack>
                  <InlineStack align="end">
                    <Button variant="primary" onClick={handleSaveCreditLimit} loading={isSaving}>
                      Guardar
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </ShopifyFrame>
  )
}
