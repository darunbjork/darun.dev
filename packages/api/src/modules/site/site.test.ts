import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../../app.js"
import type { FastifyInstance } from "fastify"
import jwt from "jsonwebtoken"
import { SITE_CONTENT_DEFAULTS, type SiteContentResponse } from "@darun/shared-types"
import { env } from "../../env.js"
import { CacheKey } from "../../utils/cache.js"

let app: FastifyInstance
let adminToken: string
let originalRow: unknown = null

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  adminToken = jwt.sign(
    { adminId: "test-admin", email: "test@darun.dev" },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  )

  // ! preserve whatever the developer saved locally — restored in afterAll
  originalRow = await app.prisma.siteContent.findUnique({
    where: { id: "singleton" },
  })
  await app.redis.del(CacheKey.siteContent())
})

afterAll(async () => {
  await app.prisma.siteContent.deleteMany({ where: { id: "singleton" } })
  if (originalRow !== null) {
    await app.prisma.siteContent.create({
      data: originalRow as Parameters<
        typeof app.prisma.siteContent.create
      >[0]["data"],
    })
  }
  await app.redis.del(CacheKey.siteContent())
  await app.close()
})

describe("GET /api/v1/site/content", () => {
  it("returns copy with paragraphs and a consistent payload shape", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/site/content",
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ success: boolean; data: SiteContentResponse }>()
    expect(body.success).toBe(true)
    expect(body.data.heroEyebrow.length).toBeGreaterThan(0)
    expect(body.data.aboutParagraphs.length).toBeGreaterThan(0)
    expect(typeof body.data.updatedAt === "string" || body.data.updatedAt === null).toBe(
      true
    )
  })
})

describe("PUT /api/v1/admin/site/content", () => {
  it("returns 401 without an auth cookie", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/site/content",
      payload: SITE_CONTENT_DEFAULTS,
    })

    expect(response.statusCode).toBe(401)
  })

  it("saves, invalidates the cache, and serves the copy publicly", async () => {
    const payload = {
      ...SITE_CONTENT_DEFAULTS,
      aboutSubtitle: "Test subtitle",
      aboutParagraphs: ["First **paragraph**", "Second paragraph"],
    }

    const saved = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/site/content",
      cookies: { token: adminToken },
      payload,
    })

    expect(saved.statusCode).toBe(200)
    const savedBody = saved.json<{ data: SiteContentResponse }>()
    expect(savedBody.data.aboutSubtitle).toBe("Test subtitle")
    expect(savedBody.data.updatedAt).not.toBeNull()

    // cache must be dropped so the public read is fresh
    expect(await app.redis.get(CacheKey.siteContent())).toBeNull()

    const publicRead = await app.inject({
      method: "GET",
      url: "/api/v1/site/content",
    })
    const publicBody = publicRead.json<{ data: SiteContentResponse }>()
    expect(publicBody.data.aboutSubtitle).toBe("Test subtitle")
    expect(publicBody.data.aboutParagraphs).toEqual([
      "First **paragraph**",
      "Second paragraph",
    ])
  })

  it("rejects a payload with no usable paragraph", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/site/content",
      cookies: { token: adminToken },
      payload: { ...SITE_CONTENT_DEFAULTS, aboutParagraphs: ["   "] },
    })

    expect(response.statusCode).toBe(400)
  })

  it("rejects more paragraphs than the limit allows", async () => {
    const response = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/site/content",
      cookies: { token: adminToken },
      payload: {
        ...SITE_CONTENT_DEFAULTS,
        aboutParagraphs: ["a", "b", "c", "d", "e"],
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
