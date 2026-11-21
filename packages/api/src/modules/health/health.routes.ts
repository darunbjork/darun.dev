import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { ok, fail } from "../../utils/response.js"
import { getLlmHealth, type LlmProbeResult } from "../../utils/gemini-client.js"

interface HealthData {
  status: "ok" | "degraded"
  timestamp: string
  services: {
    db: "ok" | "error"
    redis: "ok" | "error"
  }
  // ! informational: a broken model must not fail the Fly liveness check
  llm: LlmProbeResult
}

const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["ok", "degraded"] },
                  timestamp: { type: "string" },
                  services: {
                    type: "object",
                    properties: {
                      db: { type: "string", enum: ["ok", "error"] },
                      redis: { type: "string", enum: ["ok", "error"] },
                    },
                  },
                  llm: {
                    type: "object",
                    properties: {
                      checkedAt: { type: ["string", "null"] },
                      models: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            provider: { type: "string" },
                            model: { type: "string" },
                            status: { type: "string" },
                            httpStatus: { type: "number" },
                            latencyMs: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
              error: { type: "null" },
              correlationId: { type: "string" },
            },
          },
          503: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: { type: "null" },
              error: { type: "string" },
              correlationId: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      let dbStatus: "ok" | "error" = "ok"
      let redisStatus: "ok" | "error" = "ok"

      try {
        await fastify.prisma.$queryRaw`SELECT 1`
      } catch (error: unknown) {
        dbStatus = "error"
        request.log.error({ error }, "Database health check failed")
      }

      try {
        await fastify.redis.ping()
      } catch (error: unknown) {
        redisStatus = "error"
        request.log.error({ error }, "Redis health check failed")
      }

      const overall = dbStatus === "ok" && redisStatus === "ok" ? "ok" : "degraded"
      const correlationId = request.correlationId ?? "unknown"

      if (overall === "ok") {
        const data: HealthData = {
          status: overall,
          timestamp: new Date().toISOString(),
          services: { db: dbStatus, redis: redisStatus },
          llm: getLlmHealth(),
        }
        return reply.status(200).send(ok(data, correlationId))
      }

      return reply.status(503).send(
        fail("One or more services are degraded", correlationId)
      )
    }
  )
}

export { healthRoutes }