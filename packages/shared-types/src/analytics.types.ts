export interface DashboardStats {
  totalVisitors:     number
  totalViews:        number
  totalFeedback:     number
  chatsToday:        number
  activeRecruiters:  number
  positiveSentiment: number // ! percentage 0–100
  topProjects: Array<{
    slug:  string
    title: string
    views: number
  }>
}

export interface ProjectViewSeries {
  slug:  string
  title: string
  data:  Array<{
    date:  string
    views: number
  }>
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