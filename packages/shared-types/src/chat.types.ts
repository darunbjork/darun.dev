export type UserType = "Unknown" | "Recruiter" | "Developer" | "Client" | "Other"

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  id:        string
  sessionId: string
  role:      ChatRole
  content:   string
  timestamp: string
}

export interface ChatSession {
  id:             string
  visitorId:      string | null
  userType:       UserType
  startedAt:      string
  endedAt:        string | null
  sentimentScore: number | null
}

export interface ChatNotes {
  id:          string
  sessionId:   string
  summary:     string | null
  nextSteps:   string[] | null
  painPoints:  string[] | null
  generatedAt: string
}

export interface StartSessionResponse {
  sessionId: string
}

export interface SendMessageInput {
  sessionId: string
  content:   string
  visitorId: string
}

export interface SendMessageResponse {
  messageId: string
  reply:     string
  userType:  UserType
}

export interface GeminiStructuredOutput {
  reply:     string
  userType:  UserType
  notes: {
    summary:    string | null
    nextSteps:  string[] | null
    painPoints: string[] | null
  }
}

export interface SessionWithTranscript extends ChatSession {
  messages: ChatMessage[]
  notes:    ChatNotes | null
}