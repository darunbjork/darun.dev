import { createContext } from "react"

export type ChatRole = "user" | "assistant"

export interface ChatMessageItem {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export interface ChatContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  sessionId: string | null
  messages: ChatMessageItem[]
  userType: string | null
  isStarting: boolean
  isSending: boolean
  isEnding: boolean
  error: string | null
  startSession: () => Promise<void>
  sendMessage: (content: string) => Promise<void>
  endSession: () => Promise<void>
}

export const ChatContext = createContext<ChatContextValue | null>(null)