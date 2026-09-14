import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { FeedbackService } from "./feedback.service.js"
import { ok } from "../../utils/response.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { env } from "../../env.js"

const feedbackAdminRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const service = new FeedbackService(fastify)

  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (
          _request: unknown,
          _reply: unknown,
          done: (err?: Error) => void
        ) => {
          done()
        }

  fastify.get<{
    Querystring: { status?: string; page?: string; pageSize?: string }
  }>(
    "/api/v1/admin/feedback",
    {
      preHandler: [authGuard],
      schema: {
        querystring: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "approved", "all"],
            },
            page: { type: "string", pattern: "^[0-9]+$" },
            pageSize: { type: "string", pattern: "^[0-9]+$" },
          },
        },
      },
    },
    async (request, reply) => {
      const statusRaw = request.query.status ?? "pending"
      const status =
        statusRaw === "approved" || statusRaw === "all" ? statusRaw : "pending"
      const page = Number(request.query.page ?? "1")
      const pageSize = Number(request.query.pageSize ?? "20")
      const data = await service.listAdmin({
        status,
        page: Number.isFinite(page) ? page : 1,
        pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      })
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.patch<{
    Params: { id: string }
    Body: { approved: boolean }
  }>(
    "/api/v1/admin/feedback/:id/approve",
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
          required: ["approved"],
          properties: {
            approved: { type: "boolean" },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await service.setApproved(
        request.params.id,
        request.body.approved
      )
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )
}

export { feedbackAdminRoutes }