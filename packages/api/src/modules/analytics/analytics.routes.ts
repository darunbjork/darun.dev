import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { VisitorService } from "./visitor.service.js"
import { ok } from "../../utils/response.js"

const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const visitorService = new VisitorService(fastify)

  fastify.post(
    "/api/v1/visitors",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  visitorId: { type: "string" },
                },
              },
              error: { type: ["string", "null"] },
              correlationId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const visitorId = await visitorService.getOrCreateVisitor({
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        acceptLanguage: request.headers["accept-language"],
      })

      return reply.status(200).send(
        ok({ visitorId }, request.correlationId)
      )
    }
  )

  fastify.post<{
    Params: { slug: string }
    Body: { visitorId: string }
  }>(
    "/api/v1/projects/:slug/view",
    {
      config: { rateLimit: { max: 50, timeWindow: "1 minute" } },
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          properties: {
            slug: { type: "string", minLength: 1 },
          },
        },
        body: {
          type: "object",
          required: ["visitorId"],
          properties: {
            visitorId: { type: "string", minLength: 1 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  isUnique: { type: "boolean" },
                  totalViews: { type: "number" },
                },
              },
              error: { type: ["string", "null"] },
              correlationId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await visitorService.recordView(
        request.body.visitorId,
        request.params.slug
      )

      return reply.status(200).send(
        ok(result, request.correlationId)
      )
    }
  )
}

export { analyticsRoutes }