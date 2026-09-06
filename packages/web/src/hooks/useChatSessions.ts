import { useQuery } from "@tanstack/react-query"
import { getData } from "@/lib/api"

export interface ChatSessionListItem {
  id: string
  visitorId: string | null
  userType: string
  startedAt: string
  endedAt: string | null
  sentimentScore: number | null
  messageCount: number
  hasNotes: boolean
}

export function useChatSessions(userType?: string): {
  sessions: ChatSessionListItem[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  const query = useQuery<ChatSessionListItem[], Error>({
    queryKey: ["admin", "chat-sessions", userType ?? "all"],
    queryFn: async (): Promise<ChatSessionListItem[]> => {
      const qs =
        userType !== undefined && userType.length > 0
          ? `?userType=${encodeURIComponent(userType)}`
          : ""
      return getData<ChatSessionListItem[]>(
        `/api/v1/admin/chat/sessions${qs}`
      )
    },
    retry: false,
  })

  return {
    sessions: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: (): void => {
      void query.refetch()
    },
  }
}

export function useChatTranscript(sessionId: string | null): {
  transcript: unknown
  isLoading: boolean
  isError: boolean
  error: Error | null
} {
  const query = useQuery({
    queryKey: ["admin", "chat-transcript", sessionId],
    enabled: sessionId !== null && sessionId.length > 0,
    queryFn: async () => {
      return getData(`/api/v1/admin/chat/sessions/${sessionId}/transcript`)
    },
    retry: false,
  })

  return {
    transcript: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}