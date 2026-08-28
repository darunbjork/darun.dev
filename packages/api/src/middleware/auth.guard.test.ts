import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { buildApp } from "../app.js"
import type { FastifyInstance } from "fastify"
import jwt from "jsonwebtoken"
import { env } from "../env.js"
import { authGuard } from "./auth.guard.js"

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  // ! Add test route BEFORE calling ready()
  app.get(
    "/test-protected",
    { preHandler: [authGuard] },
    async (request) => ({ adminId: request.adminId })
  )
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe("authGuard middleware", () => {
  it("returns 401 when no cookie is present", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test-protected",
    })
    expect(response.statusCode).toBe(401)
  })

  it("attaches adminId to request when token is valid", async () => {
    const token = jwt.sign(
      { adminId: "admin-123", email: "test@darun.dev" },
      env.JWT_SECRET,
      { expiresIn: "1h" }
    )

    const response = await app.inject({
      method: "GET",
      url: "/test-protected",
      cookies: { token },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ adminId: string }>().adminId).toBe("admin-123")
  })

  it("returns 401 and clears cookie when token is expired", async () => {
    const expiredToken = jwt.sign(
      { adminId: "admin-123", email: "test@darun.dev" },
      env.JWT_SECRET,
      { expiresIn: -1 }
    )

    const response = await app.inject({
      method: "GET",
      url: "/test-protected",
      cookies: { token: expiredToken },
    })

    expect(response.statusCode).toBe(401)
    const setCookie = response.headers["set-cookie"] as string
    expect(setCookie).toContain("token=;")
  })
})