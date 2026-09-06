import { api, type ApiEnvelope } from "@/lib/api"
import { ensureVisitorId } from "@/lib/visitor"

export interface StartSessionResult {
  sessionId: string
}

export interface SendMessageResult {
  messageId: string
  reply: string
  userType: string
}

export async function postStartSession(): Promise<StartSessionResult> {
  let visitorId: string | undefined
  try {
    visitorId = await ensureVisitorId()
  } catch {
    visitorId = undefined
  }

  const res = await api.post<ApiEnvelope<StartSessionResult>>(
    "/api/v1/chat/session/start",
    visitorId !== undefined ? { visitorId } : {}
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Failed to start chat session")
  }
  return res.data.data
}

export async function postChatMessage(
  sessionId: string,
  content: string
): Promise<SendMessageResult> {
  const res = await api.post<ApiEnvelope<SendMessageResult>>(
    "/api/v1/chat/message",
    { sessionId, content },
    { timeout: 60_000 }
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Failed to send message")
  }
  return res.data.data
}

export async function postEndSession(sessionId: string): Promise<void> {
  const res = await api.post<ApiEnvelope<{ ended: boolean }>>(
    "/api/v1/chat/session/end",
    { sessionId },
    { timeout: 60_000 }
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Failed to end session")
  }
}