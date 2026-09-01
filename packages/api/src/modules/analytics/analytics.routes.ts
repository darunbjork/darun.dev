import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { VisitorService } from "./visitor.service.js"
import { AnalyticsService } from "./analytics.service.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"

const analyticsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const visitorService = new VisitorService(fastify)
  const analyticsService = new AnalyticsService(fastify)

  // ── POST /api/v1/visitors — register / refresh fingerprint
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
              data: { type: "object" },
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

      return reply.status(200).send(ok({ visitorId }, request.correlationId))
    }
  )

  // ── POST /api/v1/projects/:slug/view — record view 
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
          properties: { slug: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["visitorId"],
          properties: { visitorId: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const result = await visitorService.recordView(
        request.body.visitorId,
        request.params.slug
      )

      return reply.status(200).send(ok(result, request.correlationId))
    }
  )

  // ── GET /api/v1/analytics — admin dashboard stats (cached 60s) ──
  fastify.get(
    "/api/v1/analytics",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  totalVisitors: { type: "number" },
                  totalViews: { type: "number" },
                  totalFeedback: { type: "number" },
                  chatsToday: { type: "number" },
                  activeRecruiters: { type: "number" },
                  positiveSentiment: { type: "number" },
                  topProjects: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slug: { type: "string" },
                        title: { type: "string" },
                        views: { type: "number" },
                      },
                    },
                  },
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
      const data = await analyticsService.getDashboardStats()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )
}

export { analyticsRoutes }