import { describe, it, expect, beforeAll, afterEach } from "vitest"
import { buildApp } from "../../app.js"
import type { FastifyInstance } from "fastify"
import jwt from "jsonwebtoken"
import { env } from "../../env.js"

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
  await app.prisma.project.deleteMany({
    where: { slug: { startsWith: "test-" } },
  })
  await app.redis.del("projects:list")
})

describe("GET /api/v1/projects", () => {
  it("returns empty array when no projects exist", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/projects",
  })

  expect(response.statusCode).toBe(200)
  const body = response.json<any>()
  expect(body.success).toBe(true)
  expect(Array.isArray(body.data)).toBe(true)
})

  it("returns cached response on second request", async () => {
    await app.inject({ method: "GET", url: "/api/v1/projects" })
    const cached = await app.redis.get("projects:list")
    expect(cached).not.toBeNull()
  })
})

describe("POST /api/v1/admin/projects", () => {
  it("creates a project with valid slug", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/projects",
      cookies: { token: adminToken },
      payload: {
        slug: "test-project-one",
        title: "Test Project",
        description: "A test project",
        techStack: ["TypeScript", "Fastify"],
        published: true,
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{ data: { slug: string } }>()
    expect(body.data.slug).toBe("test-project-one")
  })

  it("returns 400 for invalid slug format", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/projects",
      cookies: { token: adminToken },
      payload: { slug: "Invalid Slug!", title: "Test" },
    })

    expect(response.statusCode).toBe(400)
  })

  it("returns 401 without auth cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/projects",
      payload: { slug: "test-unauth", title: "Unauthorized" },
    })

    expect(response.statusCode).toBe(401)
  })
})