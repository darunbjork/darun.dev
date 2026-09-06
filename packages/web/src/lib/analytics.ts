import { getData } from "@/lib/api"

export interface DashboardStats {
  totalVisitors: number
  totalViews: number
  totalFeedback: number
  chatsToday: number
  activeRecruiters: number
  positiveSentiment: number
  topProjects: Array<{ slug: string; title: string; views: number }>
}

export interface SentimentBucket {
  bucket: "negative" | "neutral" | "positive" | "unknown"
  count: number
}

export interface SessionAnalytics {
  totalSessions: number
  endedSessions: number
  avgSentiment: number | null
  sentimentDistribution: SentimentBucket[]
  byUserType: Array<{ userType: string; count: number }>
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return getData<DashboardStats>("/api/v1/analytics")
}

export async function fetchSessionAnalytics(): Promise<SessionAnalytics> {
  return getData<SessionAnalytics>("/api/v1/admin/analytics/sessions")
}