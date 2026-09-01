import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { MediaService } from "./media.service.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"
import { ValidationError } from "../../utils/errors.js"
import { env } from "../../env.js"

const envelopeSchema = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    data: { type: ["object", "null"] },
    error: { type: ["string", "null"] },
    correlationId: { type: "string" },
  },
} as const

const mediaRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const mediaService = new MediaService(fastify)

  // ! Skip CSRF in dev/test; enforce in production
  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (_request: unknown, _reply: unknown, done: (err?: Error | null) => void) => done()

  fastify.post<{
    Params: { id: string }
  }>(
    "/api/v1/admin/projects/:id/images",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 3, timeWindow: "1 minute" } },
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
        response: { 201: envelopeSchema },
      },
    },
    async (request, reply) => {
      const file = await request.file()
      if (file === undefined) {
        throw new ValidationError("Image file is required")
      }

      const buffer = await file.toBuffer()
      const altField = (file.fields as Record<string, { value?: string }>)?.alt
      const alt =
        typeof altField?.value === "string" ? altField.value : undefined

      const result = await mediaService.uploadProjectImage(
        request.params.id,
        buffer,
        file.filename,
        alt
      )

      return reply.status(201).send(ok(result, request.correlationId))
    }
  )

  fastify.delete<{
    Params: { id: string; imageId: string }
  }>(
    "/api/v1/admin/projects/:id/images/:imageId",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        params: {
          type: "object",
          required: ["id", "imageId"],
          properties: {
            id: { type: "string", minLength: 1 },
            imageId: { type: "string", minLength: 1 },
          },
        },
        response: { 200: envelopeSchema },
      },
    },
    async (request, reply) => {
      await mediaService.deleteImage(
        request.params.imageId,
        request.params.id
      )
      return reply
        .status(200)
        .send(ok({ deleted: true }, request.correlationId))
    }
  )

  fastify.patch<{
    Params: { id: string }
    Body: { orderedIds: string[] }
  }>(
    "/api/v1/admin/projects/:id/images/reorder",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: { type: "string", minLength: 1 } },
        },
        body: {
          type: "object",
          required: ["orderedIds"],
          properties: {
            orderedIds: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
            },
          },
        },
        response: { 200: envelopeSchema },
      },
    },
    async (request, reply) => {
      await mediaService.reorderImages(
        request.params.id,
        request.body.orderedIds
      )
      return reply
        .status(200)
        .send(ok({ reordered: true }, request.correlationId))
    }
  )
}

export { mediaRoutes }