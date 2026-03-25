// API client configuration
const API_BASE_URL = process.env.API_BASE_URL || "https://your-api-url.com"

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

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  async getDashboard() {
    return this.request("/api/dashboard")
  }

  async getCredits(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/credits${query ? `?${query}` : ""}`)
  }

  async getCreditById(id: string) {
    return this.request(`/api/credits/${id}`)
  }

  async getPayments(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as any).toString()
    return this.request(`/api/payments${query ? `?${query}` : ""}`)
  }
}
