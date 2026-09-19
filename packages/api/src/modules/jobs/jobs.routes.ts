import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"
import { createJobsService } from "./jobs.service.js"
import { EUROPEAN_ADZUNA_COUNTRIES } from "./jobs.client.js"
import type { JobSource } from "./jobs.types.js"

const VALID_SOURCES: readonly JobSource[] = [
  "adzuna",
  "greenhouse",
  "lever",
  "ashby",
]

const jobsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const jobs = createJobsService(fastify)

  fastify.get<{
    Querystring: {
      countries?: string
      what?: string
      where?: string
      page?: string
      sources?: string
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
            countries: { type: "string", maxLength: 60 },
            what: { type: "string", minLength: 1, maxLength: 120 },
            where: { type: "string", maxLength: 120 },
            page: { type: "string", pattern: "^[0-9]+$" },
            sources: { type: "string", maxLength: 60 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                  properties: {
                    matchScore: { type: "number" },
                    matchedSkills: { type: "array", items: { type: "string" } },
                  },
                },
              },
              meta: {
                type: "object",
                additionalProperties: true,
              },
              error: { type: "null" },
              correlationId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const rawCountries = request.query.countries?.trim()
      const countries = rawCountries
        ? rawCountries.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean)
        : [...EUROPEAN_ADZUNA_COUNTRIES]

      const rawSources = request.query.sources?.trim()
      const sources = rawSources
        ? (rawSources
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter((s): s is JobSource =>
              (VALID_SOURCES as readonly string[]).includes(s),
            ))
        : [...VALID_SOURCES]

      const data = await jobs.search({
        countries,
        what: request.query.what ?? "typescript developer",
        where: request.query.where,
        page: Number(request.query.page ?? "1") || 1,
        sources,
      })

      return reply.status(200).send({
        success: true,
        data,
        meta: { countries, sources },
        error: null,
        correlationId: request.correlationId,
      })
    },
  )
}

export { jobsRoutes }