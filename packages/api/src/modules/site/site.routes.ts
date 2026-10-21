import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import type { SiteContentData } from "@darun/shared-types"
import { SITE_CONTENT_LIMITS } from "@darun/shared-types"
import { SiteService } from "./site.service.js"
import { ok } from "../../utils/response.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { env } from "../../env.js"

const L = SITE_CONTENT_LIMITS

const paragraphSchema = {
  type: "string" as const,
  minLength: 1,
  maxLength: L.aboutParagraph,
}

const siteContentBodySchema = {
  type: "object" as const,
  required: [
    "heroEyebrow",
    "heroTitle",
    "heroAccent",
    "heroBio",
    "aboutSubtitle",
    "aboutParagraphs",
    "contactBlurb",
  ],
  properties: {
    heroEyebrow: {
      type: "string" as const,
      minLength: 1,
      maxLength: L.heroEyebrow,
    },
    heroTitle: {
      type: "string" as const,
      minLength: 1,
      maxLength: L.heroTitle,
    },
    heroAccent: {
      type: "string" as const,
      minLength: 1,
      maxLength: L.heroAccent,
    },
    heroBio: { type: "string" as const, minLength: 1, maxLength: L.heroBio },
    aboutSubtitle: {
      type: "string" as const,
      minLength: 1,
      maxLength: L.aboutSubtitle,
    },
    aboutParagraphs: {
      type: "array" as const,
      minItems: L.aboutParagraphsMin,
      maxItems: L.aboutParagraphsMax,
      items: paragraphSchema,
    },
    contactBlurb: {
      type: "string" as const,
      minLength: 1,
      maxLength: L.contactBlurb,
    },
  },
}

const siteRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const service = new SiteService(fastify)

  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (
          _request: unknown,
          _reply: unknown,
          done: (err?: Error | null) => void
        ) => {
          done()
        }

  fastify.get(
    "/api/v1/site/content",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const data = await service.get()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.get(
    "/api/v1/admin/site/content",
    {
      preHandler: [authGuard],
    },
    async (request, reply) => {
      const data = await service.get()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.put<{ Body: SiteContentData }>(
    "/api/v1/admin/site/content",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: { body: siteContentBodySchema },
    },
    async (request, reply) => {
      const data = await service.update(request.body)
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )
}

export { siteRoutes }
