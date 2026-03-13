"use client"

import { Card, DataTable, Button } from "@shopify/polaris"
import type { CustomerSummary } from "../app/lib/api.server"

interface CustomerTableProps {
  customers: CustomerSummary[]
  onViewDetails: (customerName: string) => void
}

export function CustomerTable({ customers, onViewDetails }: CustomerTableProps) {
  const rows = customers.map((customer) => [
    customer.customerName,
    customer.pendingOrders.toString(),
    customer.pendingDebt.toString(),
    customer.favorBalance.toString(),
    customer.totalOrders.toString(),
    <Button key={customer.customerName} variant="plain" onClick={() => onViewDetails(customer.customerName)}>
      Ver detalles
    </Button>,
  ])

  return (
    <Card padding="0">
      <DataTable
        columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric", "text"]}
        headings={["Cliente", "Ordenes Pendientes", "Deuda Pendiente", "Saldo a favor", "Ordenes", ""]}
        rows={rows}
        hoverable
        sortable={[true, true, true, true, true, false]}
      />
    </Card>
  )
}
