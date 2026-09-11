import { api, type ApiEnvelope } from "@/lib/api"

export interface AdminUser {
  adminId: string
  email: string
}

export interface LoginResponse {
  adminId: string
  email: string
}

export async function loginRequest(
  email: string,
  password: string
): Promise<AdminUser> {
  const res = await api.post<ApiEnvelope<LoginResponse>>(
    "/api/v1/admin/auth/login",
    { email, password }
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Login failed")
  }
  return {
    adminId: res.data.data.adminId,
    email: res.data.data.email,
  }
}

export async function logoutRequest(): Promise<void> {
  // * Fetch a fresh CSRF token (sets _csrf cookie)
  const csrfRes = await api.get<ApiEnvelope<{ csrfToken: string }>>(
    "/api/v1/csrf"
  )
  const csrfToken = csrfRes.data.data.csrfToken

  await api.post(
    "/api/v1/admin/auth/logout",
    {},
    { headers: { "x-csrf-token": csrfToken } }
  )
}

export async function checkSession(): Promise<boolean> {
  try {
    await api.get("/api/v1/admin/projects")
    return true
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as { response?: { status?: number } }).response?.status ===
        "number" &&
      (err as { response: { status: number } }).response.status === 401
    ) {
      return false
    }
    // Non-401 errors (500, network) — don't treat as logout
    return true
  }
}