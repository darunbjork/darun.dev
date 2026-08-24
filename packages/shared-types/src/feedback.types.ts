export interface FeedbackInput {
  visitorId:   string
  projectSlug: string
  rating:      1 | 2 | 3 | 4 | 5
  like:        boolean
  comment:     string // * min 10 chars — enforced at service level
}

export interface Feedback {
  id:          string
  visitorId:   string
  projectSlug: string
  rating:      number
  like:        boolean
  comment:     string
  createdAt:   string
  updatedAt:   string
}

export interface FeedbackStats {
  likeCount:     number
  dislikeCount:  number
  averageRating: number
  totalCount:    number
  distribution:  Record<1 | 2 | 3 | 4 | 5, number>
}