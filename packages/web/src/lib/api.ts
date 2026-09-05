import axios, { type AxiosInstance } from "axios"

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  error: string | null
  correlationId: string
}

const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      console.error("[API Error]", error.response?.status, error.message)
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