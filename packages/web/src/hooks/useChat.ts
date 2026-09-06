import { useContext } from "react"
import {
  ChatContext,
  type ChatContextValue,
} from "@/components/chat/chat-context"

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (ctx === null) {
    throw new Error("useChat must be used within ChatProvider")
  }
  return ctx
}