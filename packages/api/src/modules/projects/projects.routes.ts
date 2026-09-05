import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { ProjectsService } from "./projects.service.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@darun/shared-types"
import { env } from "../../env.js"

const projectsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const service = new ProjectsService(fastify)

  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (_request: unknown, _reply: unknown, done: (err?: Error | null) => void) => done()

  fastify.get(
    "/api/v1/projects",
    {
      config: { rateLimit: { max: 100, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const data = await service.list()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.get<{ Params: { slug: string } }>(
    "/api/v1/projects/:slug",
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
      const data = await service.getBySlug(request.params.slug)
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )


  fastify.get(
    "/api/v1/admin/projects",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const data = await service.listAll()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.post<{ Body: CreateProjectInput }>(
    "/api/v1/admin/projects",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["slug", "title"],
          properties: {
            slug: { type: "string", minLength: 2, maxLength: 80 },
            title: { type: "string", minLength: 1, maxLength: 200 },
            description: { type: "string" },
            techStack: { type: "array", items: { type: "string" } },
            problem: { type: "string" },
            solution: { type: "string" },
            impact: { type: "string" },
            learnings: { type: "string" },
            badge: { type: "string" },
            order: { type: "integer" },
            featured: { type: "boolean" },
            published: { type: "boolean" },
            repoUrl: { type: "string" },
            liveUrl: { type: "string" },
            coverUrl: { type: "string" },
            coverPublicId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await service.create(request.body)
      return reply.status(201).send(ok(data, request.correlationId))
    }
  )

  fastify.put<{
    Params: { id: string }
    Body: UpdateProjectInput
  }>(
    "/api/v1/admin/projects/:id",
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
          properties: {
            slug: { type: "string", minLength: 2, maxLength: 80 },
            title: { type: "string", minLength: 1, maxLength: 200 },
            description: { type: "string" },
            techStack: { type: "array", items: { type: "string" } },
            problem: { type: "string" },
            solution: { type: "string" },
            impact: { type: "string" },
            learnings: { type: "string" },
            badge: { type: "string" },
            order: { type: "integer" },
            featured: { type: "boolean" },
            published: { type: "boolean" },
            repoUrl: { type: "string" },
            liveUrl: { type: "string" },
            coverUrl: { type: "string" },
            coverPublicId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await service.update(request.params.id, request.body)
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.delete<{ Params: { id: string } }>(
    "/api/v1/admin/projects/:id",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
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
    }
  )
}

export { projectsRoutes }