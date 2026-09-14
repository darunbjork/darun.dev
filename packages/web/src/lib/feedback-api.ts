import { getData } from "@/lib/api"

export type PublicFeedbackItem = {
  id: string
  projectSlug: string
  rating: number
  like: boolean
  comment: string
  createdAt: string
}

export type PublicFeedbackPage = {
  items: PublicFeedbackItem[]
  total: number
  page: number
  pageSize: number
}

export async function fetchProjectFeedback(
  slug: string,
  page = 1,
  pageSize = 10
): Promise<PublicFeedbackPage> {
  return getData<PublicFeedbackPage>(
    `/api/v1/projects/${encodeURIComponent(slug)}/feedback?page=${page}&pageSize=${pageSize}`
  )
}

export async function fetchRecentFeedback(
  limit = 6
): Promise<PublicFeedbackItem[]> {
  return getData<PublicFeedbackItem[]>(
    `/api/v1/feedback/recent?limit=${limit}`
  )
}