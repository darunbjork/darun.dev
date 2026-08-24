export interface Visitor {
  id:              string
  fingerprintHash: string
  userAgent:       string | null
  country:         string | null
  lastSeen:        string
  createdAt:       string
}

export interface RegisterVisitorResponse {
  visitorId: string
}

export interface ProjectViewResponse {
  isUnique: boolean
  totalViews: number
}