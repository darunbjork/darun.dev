import type { FastifyInstance } from "fastify"
import { createIngestService } from "./ingest.service.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"
import { env } from "../../env.js"
import { ValidationError } from "../../utils/errors.js"

export async function ingestRoutes(fastify: FastifyInstance): Promise<void> {
  const ingest = createIngestService(fastify)

  // ! Match the CSRF pattern used by other admin POST routes
  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (_request: unknown, _reply: unknown, done: (err?: Error | null) => void) =>
          done()

  const adminOnly = { preHandler: [authGuard, csrfPreHandler] }

  fastify.post(
    "/api/v1/admin/rag/ingest/cv",
    adminOnly,
    async (request, reply) => {
      const data = await ingest.ingestCv()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.post(
    "/api/v1/admin/rag/ingest/project",
    adminOnly,
    async (request, reply) => {
      const body = request.body as { slug?: string } | undefined
      if (body === undefined || body.slug === undefined || body.slug.length === 0) {
        throw new ValidationError("slug is required")
      }
      const data = await ingest.ingestProject(body.slug)
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.post(
    "/api/v1/admin/rag/ingest/readme",
    adminOnly,
    async (request, reply) => {
      const body = request.body as { fullName?: string } | undefined
      if (
        body === undefined ||
        body.fullName === undefined ||
        body.fullName.length === 0
      ) {
        throw new ValidationError("fullName is required")
      }
      const data = await ingest.ingestReadme(body.fullName)
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.post(
    "/api/v1/admin/rag/ingest/all",
    adminOnly,
    async (request, reply) => {
      const data = await ingest.ingestAll()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )
}