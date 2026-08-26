import { describe, it, expect } from "vitest"
import { app } from "./setup.js"

describe("GET /health", () => {
  it("returns 200 with status ok when all services are healthy", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    })

    expect(response.statusCode).toBe(200)

    const body = response.json<{
      success: boolean
      data: {
        status: string
        timestamp: string
        services: { db: string; redis: string }
      }
      error: string | null
      correlationId: string
    }>()

    expect(body.success).toBe(true)
    expect(body.data.status).toBe("ok")
    expect(body.data.services.db).toBe("ok")
    expect(body.data.services.redis).toBe("ok")
    // timestamp must be a valid ISO string
    expect(new Date(body.data.timestamp).toISOString()).toBe(body.data.timestamp)
  })

  it("returns X-Correlation-ID header on every response", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    })

    expect(response.headers["x-correlation-id"]).toBeDefined()
    expect(typeof response.headers["x-correlation-id"]).toBe("string")
  })

  it("honours an incoming X-Correlation-ID header", async () => {
    const myId = "test-correlation-id-abc123"

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-correlation-id": myId },
    })

    expect(response.headers["x-correlation-id"]).toBe(myId)
  })
})