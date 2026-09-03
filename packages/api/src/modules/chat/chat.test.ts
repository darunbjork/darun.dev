import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../app.js"
import type { FastifyInstance } from "fastify"

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
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