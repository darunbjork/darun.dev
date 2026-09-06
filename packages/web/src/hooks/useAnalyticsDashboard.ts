import { useQuery } from "@tanstack/react-query"
import {
  fetchDashboardStats,
  fetchSessionAnalytics,
  type DashboardStats,
  type SessionAnalytics,
} from "@/lib/analytics"

export function useDashboardStats(): {
  stats: DashboardStats | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
} {
  const q = useQuery<DashboardStats, Error>({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: fetchDashboardStats,
    retry: false,
  })
  return {
    stats: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
  }
}

export function useSessionAnalytics(): {
  data: SessionAnalytics | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
} {
  const q = useQuery<SessionAnalytics, Error>({
    queryKey: ["admin", "session-analytics"],
    queryFn: fetchSessionAnalytics,
    retry: false,
  })
  return {
    data: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
  }
}