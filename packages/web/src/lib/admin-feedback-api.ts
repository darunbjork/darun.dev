import { api, getData, type ApiEnvelope } from "@/lib/api"

export type AdminFeedbackItem = {
  id: string
  projectSlug: string
  rating: number
  like: boolean
  comment: string
  approved: boolean
  createdAt: string
  updatedAt: string
}

export type AdminFeedbackPage = {
  items: AdminFeedbackItem[]
  total: number
  page: number
  pageSize: number
}

export async function fetchAdminFeedback(opts: {
  status: "pending" | "approved" | "all"
  page?: number
  pageSize?: number
}): Promise<AdminFeedbackPage> {
  const page = opts.page ?? 1
  const pageSize = opts.pageSize ?? 20
  const status = opts.status
  return getData<AdminFeedbackPage>(
    `/api/v1/admin/feedback?status=${encodeURIComponent(status)}&page=${page}&pageSize=${pageSize}`
  )
}

export async function setFeedbackApproved(
  id: string,
  approved: boolean
): Promise<AdminFeedbackItem> {
  const res = await api.patch<ApiEnvelope<AdminFeedbackItem>>(
    `/api/v1/admin/feedback/${encodeURIComponent(id)}/approve`,
    { approved }
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Approval failed")
  }
  return res.data.data
}