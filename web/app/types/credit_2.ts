export interface Credit {
  id: string
  customerName: string
  totalAmount: number
  balance: number
  installmentsCount: number
  pendingInstallments: number
  createdAt: string
  status: "ACTIVE" | "COMPLETED" | "CANCELLED"
}

export interface DashboardData {
  totalDebt: number
  customersWithDebt: number
  credits: Credit[]
}

export interface CustomerSummary {
  customerName: string
  pendingOrders: number
  pendingDebt: number
  favorBalance: number
  totalOrders: number
}
