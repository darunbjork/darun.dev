import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { env } from "../../env.js"
import { ChatService } from "./chat.service.js"
import { ok } from "../../utils/response.js"
import { isChatDisabled } from "../../utils/kill-switch.js"
import { MESSAGE_MAX_CHARS } from "./cost-limits.js"

const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const chatService = new ChatService(fastify)

  fastify.post<{
    Body: { visitorId?: string }
  }>(
    "/api/v1/chat/session/start",
    {
      config:
        env.NODE_ENV === "test"
          ? {}
          : {
              rateLimit: {
                max: 3,
                timeWindow: "1 hour",
                keyGenerator: (req) => req.ip,
              },
            },
      schema: {
        body: {
          type: "object",
          properties: {
            visitorId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      if (await isChatDisabled(fastify)) {
        request.log.warn({
          event: "kill_switch",
          ip: request.ip,
          reason: "chat:disabled",
        })
        return reply.status(503).send({
          success: false,
          data: null,
          error: "Chat is temporarily unavailable",
          correlationId: request.correlationId,
        })
      }

      const data = await chatService.startSession(request.body?.visitorId)
      return reply.status(201).send(ok(data, request.correlationId))
    }
  )

  fastify.post<{
    Body: { sessionId: string; content: string }
  }>(
    "/api/v1/chat/message",
    {
      config:
        env.NODE_ENV === "test"
          ? {}
          : {
              rateLimit: {
                max: 10,
                timeWindow: "1 minute",
                keyGenerator: (req) => {
                  const header = req.headers["x-session-id"]
                  return typeof header === "string" ? header : req.ip
                },
              },
            },
      schema: {
        body: {
          type: "object",
          required: ["sessionId", "content"],
          properties: {
            sessionId: { type: "string", minLength: 1 },
            content: { type: "string", minLength: 1, maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      if (await isChatDisabled(fastify)) {
        request.log.warn({
          event: "kill_switch",
          ip: request.ip,
          reason: "chat:disabled",
        })
        return reply.status(503).send({
          success: false,
          data: null,
          error: "Chat is temporarily unavailable",
          correlationId: request.correlationId,
        })
      }

      const body = request.body as { sessionId?: string; content?: string } | undefined
      const raw = typeof body?.content === "string" ? body.content : ""

      if (raw.length > MESSAGE_MAX_CHARS) {
        return reply.status(400).send({
          success: false,
          data: null,
          error: `Message too long (max ${MESSAGE_MAX_CHARS} characters)`,
          correlationId: request.correlationId,
        })
      }

      const data = await chatService.sendMessage(
        request.body.sessionId,
        request.body.content,
        request.ip
      )
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.post<{
    Body: { sessionId: string }
  }>(
    "/api/v1/chat/session/end",
    {
      config:
        env.NODE_ENV === "test"
          ? {}
          : {
              rateLimit: {
                max: 5,
                timeWindow: "1 hour",
                keyGenerator: (req) => {
                  const header = req.headers["x-session-id"]
                  return typeof header === "string" ? header : req.ip
                },
              },
            },
      schema: {
        body: {
          type: "object",
          required: ["sessionId"],
          properties: {
            sessionId: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      if (await isChatDisabled(fastify)) {
        request.log.warn({
          event: "kill_switch",
          ip: request.ip,
          reason: "chat:disabled",
        })
        return reply.status(503).send({
          success: false,
          data: null,
          error: "Chat is temporarily unavailable",
          correlationId: request.correlationId,
        })
      }

      await chatService.endSession(request.body.sessionId)
      return reply.status(200).send(ok({ ended: true }, request.correlationId))
    }
  )
}

export { chatRoutes }