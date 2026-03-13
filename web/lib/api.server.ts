// Server-side API client
const API_BASE_URL = process.env.API_BASE_URL || ""

export interface ApiConfig {
  merchantId: string
  baseUrl?: string
}

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

export interface CustomerSummary {
  customerName: string
  pendingOrders: number
  pendingDebt: number
  favorBalance: number
  totalOrders: number
}

export interface DashboardData {
  totalDebt: number
  customersWithDebt: number
  customers: CustomerSummary[]
}

export interface CreditDetail extends Credit {
  items: CreditItem[]
  installments: CreditInstallment[]
  payments: Payment[]
}

export interface CreditItem {
  id: string
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
}

export interface CreditInstallment {
  id: string
  installmentNumber: number
  amount: number
  dueDate: string
  status: "PENDIENTE" | "PAGADA" | "VENCIDO"
}

export interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  referenceNumber: string
  status: "EN_REVISION" | "APROBADO" | "RECHAZADO"
}

export class ApiClient {
  private baseUrl: string
  private merchantId: string

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl || API_BASE_URL
    this.merchantId = config.merchantId
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      "X-Merchant-ID": this.merchantId,
      ...options?.headers,
    }

    console.log("[v0] API Request:", { url, merchantId: this.merchantId })

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] API Error Response:", errorText)
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] API Response received successfully")
      return data
    } catch (error) {
      console.error("[v0] API request failed:", error)
      throw error
    }
  }

  async getDashboard(): Promise<DashboardData> {
    return this.request<DashboardData>("/api/dashboard")
  }

  async getCredits(params?: { page?: number; limit?: number }): Promise<{ data: Credit[]; total: number }> {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/credits${query ? `?${query}` : ""}`)
  }

  async getCreditsByCustomer(customerName: string): Promise<Credit[]> {
    return this.request(`/api/credits?customerName=${encodeURIComponent(customerName)}`)
  }

  async getCreditById(id: string): Promise<Credit> {
    return this.request(`/api/credits/${id}`)
  }

  async getCreditDetailById(id: string): Promise<CreditDetail> {
    return this.request(`/api/credits/${id}/detail`)
  }

  async getPayments(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/payments${query ? `?${query}` : ""}`)
  }
}

// Helper function to create API client
export function createApiClient(merchantId = "default-merchant") {
  return new ApiClient({ merchantId })
}
