import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"
import { env } from "../../env.js"
import { JobWatcherService } from "./job-watcher.service.js"
import type { AtsSource } from "../../generated/prisma/client.js"

const ATS_VALUES = ["greenhouse", "lever", "ashby"] as const

const jobWatcherRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  const service = new JobWatcherService(fastify)

  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (
          _request: unknown,
          _reply: unknown,
          done: (err?: Error | null) => void,
        ) => {
          done()
        }

  fastify.get(
    "/api/v1/admin/job-watchers",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              error: { type: "null" },
              correlationId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await service.list()
      return reply.status(200).send(ok(data, request.correlationId))
    },
  )

  fastify.post<{
    Body: { ats: string; companySlug: string; displayName?: string }
  }>(
    "/api/v1/admin/job-watchers",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["ats", "companySlug"],
          properties: {
            ats: { type: "string", enum: [...ATS_VALUES] },
            companySlug: { type: "string", minLength: 1, maxLength: 80 },
            displayName: { type: "string", maxLength: 120 },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await service.create({
        ats: request.body.ats as AtsSource,
        companySlug: request.body.companySlug,
        displayName: request.body.displayName,
      })
      return reply.status(201).send(ok(data, request.correlationId))
    },
  )

  fastify.patch<{
    Params: { id: string }
    Body: { enabled: boolean }
  }>(
    "/api/v1/admin/job-watchers/:id",
    {
      preHandler: [authGuard, csrfPreHandler],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["enabled"],
          properties: { enabled: { type: "boolean" } },
        },
      },
    },
    async (request, reply) => {
      const data = await service.setEnabled(
        request.params.id,
        request.body.enabled,
      )
      return reply.status(200).send(ok(data, request.correlationId))
    },
  )

  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/admin/job-watchers/:id",
    {
      preHandler: [authGuard, csrfPreHandler],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      await service.delete(request.params.id)
      return reply.status(200).send(ok({ deleted: true }, request.correlationId))
    },
  )
}

export { jobWatcherRoutes }