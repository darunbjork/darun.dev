import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { authGuard } from "../../middleware/auth.guard.js"
import { createJobsService } from "./jobs.service.js"
import { EUROPEAN_ADZUNA_COUNTRIES } from "./jobs.client.js"

const jobsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const jobs = createJobsService(fastify)

  fastify.get<{
    Querystring: {
      countries?: string
      what?: string
      where?: string
      page?: string
    }
  }>(
    "/api/v1/admin/jobs/search",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        querystring: {
          type: "object",
          properties: {
            countries: {
              type: "string",
              maxLength: 60,
              description:
                "Comma-separated country codes. Defaults to all European Adzuna countries.",
            },
            what: { type: "string", minLength: 1, maxLength: 120 },
            where: { type: "string", maxLength: 120 },
            page: { type: "string", pattern: "^[0-9]+$" },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              meta: {
                type: "object",
                properties: {
                  countries: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
              error: { type: "null" },
              correlationId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const raw = request.query.countries?.trim()
      const countries = raw
        ? raw
            .split(",")
            .map((country) => country.trim().toLowerCase())
            .filter(Boolean)
        : [...EUROPEAN_ADZUNA_COUNTRIES]

      const data = await jobs.searchAdzuna({
        countries,
        what: request.query.what ?? "typescript developer",
        where: request.query.where,
        page: Number(request.query.page ?? "1") || 1,
      })

      return reply.status(200).send({
        success: true,
        data,
        meta: { countries },
        error: null,
        correlationId: request.correlationId,
      })
    }
  )
}

export { jobsRoutes }
