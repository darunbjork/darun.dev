import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { FeedbackService } from "./feedback.service.js"
import { ok } from "../../utils/response.js"
import type { FeedbackInput } from "@darun/shared-types"

const feedbackRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const service = new FeedbackService(fastify)

  fastify.post<{
    Params: { slug: string }
    Body: Omit<FeedbackInput, "projectSlug">
  }>(
    "/api/v1/projects/:slug/feedback",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["visitorId", "rating", "like", "comment"],
          properties: {
            visitorId: { type: "string", minLength: 1 },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            like: { type: "boolean" },
            comment: { type: "string", minLength: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      await service.submitFeedback({
        visitorId: request.body.visitorId,
        projectSlug: request.params.slug,
        rating: request.body.rating,
        like: request.body.like,
        comment: request.body.comment,
      })

      return reply
        .status(201)
        .send(ok({ submitted: true }, request.correlationId))
    }
  )

  fastify.get<{
    Params: { slug: string }
  }>(
    "/api/v1/projects/:slug/feedback/stats",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const data = await service.getStats(request.params.slug)
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )
}

export { feedbackRoutes }