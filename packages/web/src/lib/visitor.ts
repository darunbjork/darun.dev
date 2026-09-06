import { api, type ApiEnvelope } from "./api"

const STORAGE_KEY = "darun_visitor_id"

export async function ensureVisitorId(): Promise<string> {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing !== null && existing.length > 0) {
    return existing
  }

  const res = await api.post<ApiEnvelope<{ visitorId: string }>>(
    "/api/v1/visitors",
    {}
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Failed to register visitor")
  }

  localStorage.setItem(STORAGE_KEY, res.data.data.visitorId)
  return res.data.data.visitorId
}

export async function trackProjectView(slug: string): Promise<void> {
  const visitorId = await ensureVisitorId()
  await api.post<ApiEnvelope<{ isUnique: boolean; totalViews: number }>>(
    `/api/v1/projects/${encodeURIComponent(slug)}/view`,
    { visitorId }
  )
}