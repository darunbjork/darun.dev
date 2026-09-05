import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { buildApp } from "../../app.js"
import type { FastifyInstance } from "fastify"
import jwt from "jsonwebtoken"
import { env } from "../../env.js"
import { CacheKey } from "../../utils/cache.js"

let app: FastifyInstance
let adminToken: string

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  adminToken = jwt.sign(
    { adminId: "test-admin", email: "test@darun.dev" },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  )
})

afterEach(async () => {
  await app.redis.del(CacheKey.analytics())
  await app.redis.del(CacheKey.sessionAnalytics()) 
})

describe("GET /api/v1/analytics", () => {
  it("returns 401 without auth cookie", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/analytics",
    })
    expect(response.statusCode).toBe(401)
  })

  it("returns dashboard stats for authenticated admin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/analytics",
      cookies: { token: adminToken },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{
      success: boolean
      data: {
        totalVisitors: number
        totalViews: number
        totalFeedback: number
        chatsToday: number
        activeRecruiters: number
        positiveSentiment: number
        topProjects: unknown[]
      }
    }>()

    expect(body.success).toBe(true)
    expect(typeof body.data.totalVisitors).toBe("number")
    expect(typeof body.data.totalViews).toBe("number")
    expect(typeof body.data.totalFeedback).toBe("number")
    expect(typeof body.data.chatsToday).toBe("number")
    expect(typeof body.data.activeRecruiters).toBe("number")
    expect(typeof body.data.positiveSentiment).toBe("number")
    expect(Array.isArray(body.data.topProjects)).toBe(true)
  })

  it("caches the response in Redis", async () => {
    await app.inject({
      method: "GET",
      url: "/api/v1/analytics",
      cookies: { token: adminToken },
    })

    const cached = await app.redis.get(CacheKey.analytics())
    expect(cached).not.toBeNull()
  })
})

describe("GET /api/v1/admin/analytics/sessions", () => {
  it("returns 401 for session analytics without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/sessions",
    })
    expect(response.statusCode).toBe(401)
  })

  it("returns session analytics shape for admin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/admin/analytics/sessions",
      cookies: { token: adminToken },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json<{
      data: {
        totalSessions: number
        endedSessions: number
        avgSentiment: number | null
        sentimentDistribution: unknown[]
        byUserType: unknown[]
      }
    }>()
    expect(typeof body.data.totalSessions).toBe("number")
    expect(Array.isArray(body.data.sentimentDistribution)).toBe(true)
    expect(Array.isArray(body.data.byUserType)).toBe(true)
  })
})