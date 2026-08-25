import type { FastifyInstance, FastifyPluginAsync } from "fastify"

interface HealthResponse {
  status: "ok" | "degraded"
  timestamp: string
  services: {
    db: "ok" | "error"
    redis: "ok" | "error"
  }
}

const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get<{ Reply: HealthResponse }>(
    "/health",
    {
      schema: {
        response: {
          200: {
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

      return reply.status(overall === "ok" ? 200 : 503).send({
        status: overall,
        timestamp: new Date().toISOString(),
        services: { db: dbStatus, redis: redisStatus },
      })
    }
  )
}

export { healthRoutes }