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