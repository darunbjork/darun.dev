import { useQuery } from "@tanstack/react-query"
import {
  fetchProjectFeedback,
  fetchRecentFeedback,
} from "@/lib/feedback-api"

export function useProjectFeedback(slug: string | undefined, page = 1) {
  return useQuery({
    queryKey: ["feedback", "project", slug, page],
    queryFn: () => fetchProjectFeedback(slug!, page),
    enabled: Boolean(slug),
    staleTime: 60_000,
  })
}

export function useRecentFeedback(limit = 6) {
  return useQuery({
    queryKey: ["feedback", "recent", limit],
    queryFn: () => fetchRecentFeedback(limit),
    staleTime: 60_000,
  })
}