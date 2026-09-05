import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { ChatService } from "./chat.service.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"
import { env } from "../../env.js"

const chatAdminRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const chatService = new ChatService(fastify)

  // * Skip CSRF in dev/test; enforce in production
  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (_req: unknown, _res: unknown, done: (err?: Error | null) => void) =>
          done()

  fastify.get<{ Querystring: { userType?: string } }>(
    "/api/v1/admin/chat/sessions",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        querystring: {
          type: "object",
          properties: {
            userType: {
              type: "string",
              enum: ["Unknown", "Recruiter", "Developer", "Client", "Other"],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await chatService.listSessions({
        userType: request.query.userType,
      })
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.get<{ Params: { id: string } }>(
    "/api/v1/admin/chat/sessions/:id/transcript",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const data = await chatService.getTranscript(request.params.id)
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.get(
    "/api/v1/admin/chat/context",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      return reply
        .status(200)
        .send(ok(chatService.getContext(), request.correlationId))
    }
  )

  fastify.post(
    "/api/v1/admin/chat/context/reload",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const data = chatService.reloadContext()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )
}

export { chatAdminRoutes }