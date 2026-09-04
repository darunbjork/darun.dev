// packages/api/src/modules/chat/chat.service.ts
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import type { FastifyInstance } from "fastify"
import { GeminiService } from "./gemini.service.js"
import { scoreSentiment } from "./sentiment.service.js"
import { sanitizeChatMessage } from "../../utils/sanitize.js"
import type {
  StartSessionResponse,
  SendMessageResponse,
  SessionWithTranscript,
} from "@darun/shared-types"
import { NotFoundError, AppError } from "../../utils/errors.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const CONTEXT = JSON.parse(
  readFileSync(join(__dirname, "portfolio-context.json"), "utf-8")
) as { version: string; [key: string]: unknown }

const CONTEXT_JSON = JSON.stringify(CONTEXT)
const CONTEXT_VERSION = CONTEXT.version

export class ChatService {
  private readonly gemini = new GeminiService()

  constructor(private readonly fastify: FastifyInstance) {}

  async startSession(
    visitorId: string | undefined
  ): Promise<StartSessionResponse> {
    const session = await this.fastify.prisma.chatSession.create({
      data: {
        visitorId: visitorId ?? null,
        userType: "Unknown",
      },
    })

    return { sessionId: session.id }
  }

  async sendMessage(
    sessionId: string,
    rawContent: string
  ): Promise<SendMessageResponse> {
    const session = await this.fastify.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    })

    if (session === null) {
      throw new NotFoundError("Chat session")
    }

    if (session.endedAt !== null) {
      throw new AppError("Session already ended", 400, "SESSION_ENDED")
    }

    const content = sanitizeChatMessage(rawContent)
    if (content.length === 0) {
      throw new AppError("Message cannot be empty", 400, "EMPTY_MESSAGE")
    }

    await this.fastify.prisma.chatMessage.create({
      data: { sessionId, role: "user", content },
    })

    // messages were fetched desc → reverse for chronological history
    const history = session.messages
      .slice()
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }))

    const result = await this.gemini.generateReply(
      content,
      history,
      CONTEXT_JSON,
      CONTEXT_VERSION
    )

    const assistantMsg = await this.fastify.prisma.chatMessage.create({
      data: {
        sessionId,
        role: "assistant",
        content: result.reply,
      },
    })

    await this.fastify.prisma.chatSession.update({
      where: { id: sessionId },
      data: { userType: result.userType },
    })

    return {
      messageId: assistantMsg.id,
      reply: result.reply,
      userType: result.userType,
    }
  }

  async endSession(sessionId: string): Promise<void> {
    const session = await this.fastify.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { timestamp: "asc" } },
      },
    })

    if (session === null) {
      throw new NotFoundError("Chat session")
    }

    // 1) Mark ended FIRST (always succeeds)
    await this.fastify.prisma.chatSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    })

    // 2) Best-effort sentiment scoring (never fails the session)
    const visitorMessages = session.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n")

    const sentimentScore = await scoreSentiment(visitorMessages)
    if (sentimentScore !== null) {
      await this.fastify.prisma.chatSession.update({
        where: { id: sessionId },
        data: { sentimentScore },
      })
    }

    // 3) Best-effort notes generation (only if enough messages)
    if (session.messages.length > 2) {
      await this.generateNotes(sessionId, session.messages)
    }
  }


  async getTranscript(sessionId: string): Promise<SessionWithTranscript> {
    const session = await this.fastify.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { timestamp: "asc" } },
        notes: true,
      },
    })

    if (session === null) {
      throw new NotFoundError("Chat session")
    }

    return {
      id: session.id,
      visitorId: session.visitorId,
      userType: session.userType,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      sentimentScore: session.sentimentScore,
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
      notes: session.notes
        ? {
            summary: session.notes.summary,
            nextSteps: session.notes.nextSteps,
            painPoints: session.notes.painPoints,
          }
        : null,
    }
  }
private async generateNotes(
  sessionId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")

  const notesPrompt = `Analyze this portfolio site chat transcript and extract structured notes.

TRANSCRIPT:
${transcript}

Respond ONLY with the required JSON (reply can be a short ack; put the analysis in notes).`

  try {
    const result = await this.gemini.generateReply(
      notesPrompt,
      [],
      CONTEXT_JSON,
      CONTEXT_VERSION
    )

    await this.fastify.prisma.chatNotes.upsert({
      where: { sessionId },
      update: {
        summary: result.notes.summary,
        nextSteps: result.notes.nextSteps ?? [],  
        painPoints: result.notes.painPoints ?? [], 
      },
      create: {
        sessionId,
        summary: result.notes.summary,
        nextSteps: result.notes.nextSteps ?? [],
        painPoints: result.notes.painPoints ?? [],
      },
    })
  } catch {
    // Non-fatal — session already ended
    this.fastify.log.warn({ sessionId }, "Note generation failed — non-fatal")
  }
}}