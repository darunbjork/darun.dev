import { getData, api, type ApiEnvelope } from "./api.js"

const STORAGE_KEY = "darun_visitor_id"

export async function ensureVisitorId(): Promise<string> {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing !== null && existing.length > 0) {
    return existing
  }

  const data = await getData<{ visitorId: string }>("/api/v1/visitors")
  localStorage.setItem(STORAGE_KEY, data.visitorId)
  return data.visitorId
}

export async function trackProjectView(slug: string): Promise<void> {
  const visitorId = await ensureVisitorId()
  await api.post<ApiEnvelope<{ isUnique: boolean; totalViews: number }>>(
    `/api/v1/projects/${encodeURIComponent(slug)}/view`,
    { visitorId }
  )
}