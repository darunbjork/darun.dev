import { api, getData, type ApiEnvelope } from "@/lib/api"

export type AtsSource = "greenhouse" | "lever" | "ashby"

export type JobWatcher = {
  id: string
  ats: AtsSource
  companySlug: string
  displayName: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export function fetchJobWatchers(): Promise<JobWatcher[]> {
  return getData<JobWatcher[]>("/api/v1/admin/job-watchers")
}

export async function createJobWatcher(input: {
  ats: AtsSource
  companySlug: string
  displayName?: string
}): Promise<JobWatcher> {
  const res = await api.post<ApiEnvelope<JobWatcher>>(
    "/api/v1/admin/job-watchers",
    input,
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Failed to create watcher")
  }
  return res.data.data
}

export async function setJobWatcherEnabled(
  id: string,
  enabled: boolean,
): Promise<JobWatcher> {
  const res = await api.patch<ApiEnvelope<JobWatcher>>(
    `/api/v1/admin/job-watchers/${encodeURIComponent(id)}`,
    { enabled },
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Failed to update watcher")
  }
  return res.data.data
}

export async function deleteJobWatcher(id: string): Promise<void> {
  const res = await api.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/api/v1/admin/job-watchers/${encodeURIComponent(id)}`,
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Failed to delete watcher")
  }
}