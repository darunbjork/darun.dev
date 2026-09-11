import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios"

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  error: string | null
  correlationId: string
}

const API_URL: string = import.meta.env.VITE_API_URL || ""

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

// ─────────────────────────────────────────────────────────────
// CSRF token cache — fetched once, reused, refreshed on 403
// ─────────────────────────────────────────────────────────────
let csrfToken: string | null = null

async function fetchCsrfToken(): Promise<string> {
  const res = await axios.get<ApiEnvelope<{ csrfToken: string }>>(
    `${API_URL}/api/v1/csrf`,
    { withCredentials: true }
  )
  if (!res.data.success) throw new Error("Failed to fetch CSRF token")
  csrfToken = res.data.data.csrfToken
  return csrfToken
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken !== null) return csrfToken
  return fetchCsrfToken()
}

// Attach CSRF header to state-changing requests
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase()
  const needsCsrf = ["post", "put", "patch", "delete"].includes(method)

  // Skip CSRF for the CSRF endpoint itself and for login (unauthenticated)
  const url = config.url ?? ""
  const skip = url.includes("/csrf") || url.includes("/admin/auth/login")

  if (needsCsrf && !skip) {
    const token = await getCsrfToken()
    config.headers.set("x-csrf-token", token)
  }

  return config
})

// Retry once on CSRF failure (token may have expired)
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const message = String(error.response?.data?.message ?? "")

      if (
        status === 403 &&
        message.toLowerCase().includes("csrf") &&
        error.config !== undefined &&
        !(error.config as { _retried?: boolean })._retried
      ) {
        csrfToken = null
        ;(error.config as { _retried?: boolean })._retried = true
        return api.request(error.config)
      }

      console.error("[API Error]", status, error.message)
    }
    return Promise.reject(error)
  }
)

export async function getData<T>(url: string): Promise<T> {
  const res = await api.get<ApiEnvelope<T> | T>(url)
  const body = res.data
  if (
    body !== null &&
    typeof body === "object" &&
    "success" in body &&
    "data" in body
  ) {
    const envelope = body as ApiEnvelope<T>
    if (!envelope.success) throw new Error(envelope.error ?? "Request failed")
    return envelope.data
  }
  return body as T
}