// Server-side API client
const API_BASE_URL = process.env.API_BASE_URL || ""

export interface ApiConfig {
  accessToken: string
  baseUrl?: string
}

export class ApiClient {
  private baseUrl: string
  private accessToken: string

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl || API_BASE_URL
    this.accessToken = config.accessToken
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.accessToken}`,
      ...options?.headers,
    }

    console.log("[v0] API Request:", { url, accessToken: this.accessToken })

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

  async getDashboard() {
    return this.request("/api/dashboard")
  }

  async getCredits(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/credits${query ? `?${query}` : ""}`)
  }

  async getCreditsByCustomer(customerName: string) {
    return this.request(`/api/credits?customerName=${encodeURIComponent(customerName)}`)
  }

  async getCreditById(id: string) {
    return this.request(`/api/credits/${id}`)
  }

  async getCreditDetailById(id: string) {
    return this.request(`/api/credits/${id}/detail`)
  }

  async getPayments(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/payments${query ? `?${query}` : ""}`)
  }
}

// Helper function to create API client
export function createApiClient(accessToken = "default-token") {
  return new ApiClient({ accessToken })
}
