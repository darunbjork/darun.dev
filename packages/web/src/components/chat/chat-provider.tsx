import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  ChatContext,
  type ChatMessageItem,
} from "@/components/chat/chat-context"
import {
  postStartSession,
  postChatMessage,
  postEndSession,
} from "@/lib/chat-api"

export function ChatProvider({
  children,
}: {
  children: ReactNode
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [userType, setUserType] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  const startSession = useCallback(async (): Promise<void> => {
    if (sessionId !== null || isStarting) return
    setIsStarting(true)
    setError(null)
    try {
      const result = await postStartSession()
      setSessionId(result.sessionId)
    } catch (err: unknown) {
      console.error("Start session error:", err)
      setError(err instanceof Error ? err.message : "Could not start chat")
    } finally {
      setIsStarting(false)
    }
  }, [sessionId, isStarting])

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim()
      if (trimmed.length === 0 || isSending) return

      setIsSending(true)
      setError(null)

      try {
        let activeSessionId = sessionId
        if (activeSessionId === null) {
          setIsStarting(true)
          const started = await postStartSession()
          activeSessionId = started.sessionId
          setSessionId(activeSessionId)
          setIsStarting(false)
        }

        const tempId = `local-${Date.now()}`
        const userMsg: ChatMessageItem = {
          id: tempId,
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMsg])

        const result = await postChatMessage(activeSessionId, trimmed)

        const assistantMsg: ChatMessageItem = {
          id: result.messageId,
          role: "assistant",
          content: result.reply,
          createdAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setUserType(result.userType)
      } catch (err: unknown) {
        console.error("Send message error:", err)
        setError(err instanceof Error ? err.message : "Send failed")
      } finally {
        setIsStarting(false)
        setIsSending(false)
      }
    },
    [sessionId, isSending]
  )

  const endSession = useCallback(async (): Promise<void> => {
    if (sessionId === null || isEnding) {
      setIsOpen(false)
      return
    }
    const currentSessionId = sessionId
    setIsEnding(true)
    setError(null)
    try {
      await postEndSession(currentSessionId)
    } catch (err: unknown) {
      console.error("End session error:", err)
      setError(err instanceof Error ? err.message : "Could not end session")
    } finally {
      setSessionId(null)
      setMessages([])
      setUserType(null)
      setIsOpen(false)
      setIsEnding(false)
    }
  }, [sessionId, isEnding])

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      sessionId,
      messages,
      userType,
      isStarting,
      isSending,
      isEnding,
      error,
      startSession,
      sendMessage,
      endSession,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      sessionId,
      messages,
      userType,
      isStarting,
      isSending,
      isEnding,
      error,
      startSession,
      sendMessage,
      endSession,
    ]
  )

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  )
}