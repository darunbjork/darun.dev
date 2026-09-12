import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { env } from "../../env.js"
import { AuthService } from "./auth.service.js"
import { ok } from "../../utils/response.js"
import { PasswordResetService } from "./password-reset.service.js"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
}

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const authService = new AuthService(fastify)
  const passwordResetService = new PasswordResetService(fastify)

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

fastify.post<{
  Body: { email: string }
}>(
  "/api/v1/admin/auth/forgot-password",
  {
    config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
    schema: {
      body: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            error: { type: ["string", "null"] },
            correlationId: { type: "string" },
          },
        },
      },
    },
  },
  async (request, reply) => {
    await passwordResetService.requestReset(request.body.email)
    return reply.status(200).send(
      ok(
        { message: "If that email exists, a reset link has been sent." },
        request.correlationId
      )
    )
  }
)

fastify.post<{
  Body: { token: string; password: string }
}>(
  "/api/v1/admin/auth/reset-password",
  {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    schema: {
      body: {
        type: "object",
        required: ["token", "password"],
        properties: {
          token: { type: "string", minLength: 10 },
          password: { type: "string", minLength: 8 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            error: { type: ["string", "null"] },
            correlationId: { type: "string" },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const { token, password } = request.body
    await passwordResetService.resetPassword(token, password)
    return reply.status(200).send(
      ok({ message: "Password updated successfully" }, request.correlationId)
    )
  }
)
}

export { authRoutes }