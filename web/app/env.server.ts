function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (!value) {
    console.warn(`[v0] Warning: ${key} environment variable is not set`)
  }
  return value || ""
}

export const env = {
  API_BASE_URL: getEnvVar("API_BASE_URL", "https://api.example.com"),
  MERCHANT_ID: getEnvVar("MERCHANT_ID", "default-merchant"),
}
