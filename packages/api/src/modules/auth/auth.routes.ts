import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { AuthService } from "./auth.service.js"
import { ok } from "../../utils/response.js"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
}

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const authService = new AuthService(fastify)

  fastify.post<{ Body: { email: string; password: string } }>(
    "/api/v1/admin/auth/register",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body
      await authService.createAdmin(email, password)
      return reply.status(201).send(
        ok({ created: true }, request.correlationId)
      )
    }
  )

  fastify.post<{ Body: { email: string; password: string } }>(
    "/api/v1/admin/auth/login",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body
      const result = await authService.login(email, password)
      reply.setCookie("token", result.token, COOKIE_OPTIONS)
      return reply.status(200).send(
        ok({ adminId: result.adminId, email: result.email }, request.correlationId)
      )
    }
  )

  fastify.post("/api/v1/admin/auth/logout", async (request, reply) => {
    reply.clearCookie("token", { path: "/" })
    return reply.status(200).send(
      ok({ message: "Logged out" }, request.correlationId)
    )
  })
}

export { authRoutes }