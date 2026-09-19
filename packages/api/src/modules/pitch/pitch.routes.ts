import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from "fastify"
import { authGuard } from "../../middleware/auth.guard.js"
import { ok } from "../../utils/response.js"
import { env } from "../../env.js"
import { PitchService } from "./pitch.service.js"

const pitchRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
): Promise<void> => {
  const service = new PitchService(fastify)

  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (
          _request: unknown,
          _reply: unknown,
          done: (err?: Error | null) => void,
        ): void => {
          done()
        }

  fastify.post<{ Body: { jdText: string } }>(
    "/api/v1/admin/pitch/generate",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        body: {
          type: "object",
          required: ["jdText"],
          properties: {
            jdText: { type: "string", minLength: 1, maxLength: 10000 },
          },
        },
      },
    },
    async (request, reply): Promise<FastifyReply> => {
      const data = await service.generate(request.body.jdText)
      return reply.status(200).send(ok(data, request.correlationId))
    },
  )
}

export { pitchRoutes }
