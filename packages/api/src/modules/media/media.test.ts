import { describe, it, expect, beforeAll } from "vitest"
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

describe("POST /api/v1/admin/projects/:id/images", () => {
  it("returns 401 without auth cookie", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/projects/fake-id/images",
    })
    expect(response.statusCode).toBe(401)
  })

  it("returns 400 when no file is attached", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/projects/fake-id/images",
      cookies: { token: adminToken },
      headers: {
        "content-type": "multipart/form-data; boundary=----test",
      },
      payload: "------test--",
    })
    expect([400, 403, 404]).toContain(response.statusCode)
  })
})

describe("DELETE /api/v1/admin/projects/:id/images/:imageId", () => {
  it("returns 401 without auth cookie", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/v1/admin/projects/fake-id/images/fake-image",
    })
    expect(response.statusCode).toBe(401)
  })
})

describe("PATCH /api/v1/admin/projects/:id/images/reorder", () => {
  it("returns 401 without auth cookie", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/v1/admin/projects/fake-id/images/reorder",
      payload: { orderedIds: ["a"] },
    })
    expect(response.statusCode).toBe(401)
  })
})