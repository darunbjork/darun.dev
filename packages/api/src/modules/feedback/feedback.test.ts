import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest"
import { buildApp } from "../../app.js"
import type { FastifyInstance } from "fastify"
import { CacheKey } from "../../utils/cache.js"

let app: FastifyInstance
let visitorId: string
let projectSlug: string

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  projectSlug = "fb-test-project"

  await app.prisma.project.deleteMany({
    where: { slug: projectSlug },
  })

  const project = await app.prisma.project.create({
    data: {
      slug: projectSlug,
      title: "Feedback Test Project",
      published: true,
      techStack: [],
    },
  })

  const visitorRes = await app.inject({
    method: "POST",
    url: "/api/v1/visitors",
  })
  visitorId = visitorRes.json<{ data: { visitorId: string } }>().data.visitorId
  console.log("Visitor ID:", visitorId)
})

afterAll(async () => {
  await app.prisma.project.deleteMany({
    where: { slug: projectSlug },
  })
})

afterEach(async () => {
  await app.prisma.feedback.deleteMany({
    where: { projectSlug },
  })
  await app.redis.del(CacheKey.feedbackStats(projectSlug))
  await app.prisma.project.updateMany({
    where: { slug: projectSlug },
    data: { likeCount: 0, dislikeCount: 0, averageRating: 0 },
  })
})

describe("POST /api/v1/projects/:slug/feedback", () => {
  it("accepts valid feedback", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${projectSlug}/feedback`,
      payload: {
        visitorId,
        rating: 5,
        like: true,
        comment: "Great project, learned a lot from the write-up.",
      },
    })
    console.log("Valid feedback response:", response.statusCode, response.body)

    expect(response.statusCode).toBe(201)
    expect(response.json<{ success: boolean }>().success).toBe(true)
  })

  it("rejects comment shorter than 10 characters", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${projectSlug}/feedback`,
      payload: {
        visitorId,
        rating: 4,
        like: true,
        comment: "Too short",
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it("rejects duplicate feedback from same visitor", async () => {
    const payload = {
      visitorId,
      rating: 5,
      like: true,
      comment: "First submission with enough characters.",
    }

    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${projectSlug}/feedback`,
      payload,
    })

    const second = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${projectSlug}/feedback`,
      payload,
    })

    expect(second.statusCode).toBe(409)
  })
})

describe("GET /api/v1/projects/:slug/feedback/stats", () => {
  it("returns stats shape and caches result", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${projectSlug}/feedback/stats`,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{
      success: boolean
      data: {
        likeCount: number
        dislikeCount: number
        averageRating: number
        totalCount: number
        distribution: Record<string, number>
      }
    }>()

    expect(body.success).toBe(true)
    expect(typeof body.data.totalCount).toBe("number")
    expect(body.data.distribution).toBeDefined()

    const cached = await app.redis.get(CacheKey.feedbackStats(projectSlug))
    expect(cached).not.toBeNull()
  })
})