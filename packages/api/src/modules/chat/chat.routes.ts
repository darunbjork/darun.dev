import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { ChatService } from "./chat.service.js"
import { ok } from "../../utils/response.js"

const chatRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const chatService = new ChatService(fastify)

  fastify.post<{
    Body: { visitorId?: string }
  }>(
    "/api/v1/chat/session/start",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
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
      const data = await chatService.startSession(request.body?.visitorId)
      return reply.status(201).send(ok(data, request.correlationId))
    }
  )

  fastify.post<{
    Body: { sessionId: string; content: string }
  }>(
    "/api/v1/chat/message",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
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
      const data = await chatService.sendMessage(
        request.body.sessionId,
        request.body.content
      )
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.post<{
    Body: { sessionId: string }
  }>(
    "/api/v1/chat/session/end",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
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
      await chatService.endSession(request.body.sessionId)
      return reply.status(200).send(ok({ ended: true }, request.correlationId))
    }
  )
}

export { chatRoutes }