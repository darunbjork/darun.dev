import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"
import { buildApp } from "../../app.js"
import type { FastifyInstance } from "fastify"

const { callGeminiSpy } = vi.hoisted(() => ({
  callGeminiSpy: vi.fn(),
}))

vi.mock(import("../../utils/gemini-client.js"), () => ({
  callGemini: callGeminiSpy,
}))

vi.mock(import("../rag/retrieve.js"), () => ({
  retrieveChunks: vi.fn().mockResolvedValue([
    {
      content: "Mock CV chunk for testing.",
      source: "cv",
      similarity: 0.9,
    },
  ]),
}))

function geminiReply(userType: string, reply = "This is a test reply."): string {
  return JSON.stringify({
    reply,
    userType,
    notes: { summary: null, nextSteps: null, painPoints: null },
  })
}

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  callGeminiSpy.mockReset()
})

describe("Chat session lifecycle", () => {
  it("starts a session and returns sessionId", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/start",
      payload: {},
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{
      success: boolean
      data: { sessionId: string }
    }>()
    expect(body.success).toBe(true)
    expect(typeof body.data.sessionId).toBe("string")
    expect(body.data.sessionId.length).toBeGreaterThan(0)
  })

  it("rejects empty message content at schema level", async () => {
    const start = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/start",
      payload: {},
    })
    const sessionId = start.json<{ data: { sessionId: string } }>().data
      .sessionId

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/chat/message",
      payload: { sessionId, content: "" },
    })
    expect(response.statusCode).toBe(400)
  })

  it("returns 404 for message on unknown session", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/chat/message",
      payload: {
        sessionId: "nonexistent-session-id",
        content: "Hello there",
      },
    })

    expect(response.statusCode).toBe(404)
  })

  it("ends a session successfully", async () => {
    const start = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/start",
      payload: {},
    })
    const sessionId = start.json<{ data: { sessionId: string } }>().data
      .sessionId

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/end",
      payload: { sessionId },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ success: boolean }>().success).toBe(true)
  })

  it("ends session even when there are few messages (no notes required)", async () => {
    const start = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/start",
      payload: {},
    })
    const sessionId = start.json<{ data: { sessionId: string } }>().data.sessionId

    const end = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/end",
      payload: { sessionId },
    })

    expect(end.statusCode).toBe(200)

    const row = await app.prisma.chatSession.findUnique({
      where: { id: sessionId },
    })
    expect(row?.endedAt).not.toBeNull()
  })
})

describe("userType persistence (mocked Gemini)", () => {
  it("updates session.userType after a successful message", async () => {
    callGeminiSpy.mockResolvedValueOnce({
      text: geminiReply("Recruiter"),
      model: "test",
      attempts: 1,
    })

    const start = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/start",
      payload: {},
    })
    const sessionId = start.json<{ data: { sessionId: string } }>().data.sessionId

    const msg = await app.inject({
      method: "POST",
      url: "/api/v1/chat/message",
      payload: {
        sessionId,
        content: "I am a recruiter — when is your LIA internship window?",
      },
    })

    expect(msg.statusCode).toBe(200)
    const body = msg.json<{
      success: boolean
      data: { reply: string; userType: string }
    }>()
    expect(body.success).toBe(true)
    expect(body.data.userType).toBe("Recruiter")

    const session = await app.prisma.chatSession.findUnique({
      where: { id: sessionId },
    })
    expect(session?.userType).toBe("Recruiter")
  })

  it("refuses unknown topics without inventing stack details", async () => {
    callGeminiSpy.mockResolvedValueOnce({
      text: geminiReply(
        "Unknown",
        "That's not in my current stack, but I pick up new technologies quickly."
      ),
      model: "test",
      attempts: 1,
    })

    const start = await app.inject({
      method: "POST",
      url: "/api/v1/chat/session/start",
      payload: {},
    })
    const sessionId = start.json<{ data: { sessionId: string } }>().data.sessionId

    const msg = await app.inject({
      method: "POST",
      url: "/api/v1/chat/message",
      payload: {
        sessionId,
        content: "What is Darun's experience with COBOL mainframes?",
      },
    })

    expect(msg.statusCode).toBe(200)
    const reply = msg.json<{ data: { reply: string } }>().data.reply.toLowerCase()

    expect(reply.includes("cobol")).toBe(false)
    expect(
      reply.includes("don't have that detail") ||
        reply.includes("not in my current stack") ||
        reply.includes("pick up new technologies")
    ).toBe(true)
  })
})

describe("Admin chat routes", () => {
  it("rejects unauthenticated session list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/admin/chat/sessions",
    })
    expect(res.statusCode).toBe(401)
  })

  it("rejects unauthenticated context reload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/admin/chat/context/reload",
    })
    expect(res.statusCode).toBe(401)
  })
})