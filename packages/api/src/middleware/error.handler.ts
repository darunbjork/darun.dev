import type { FastifyError, FastifyRequest, FastifyReply } from "fastify"

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const correlationId = request.correlationId ?? "unknown"

  request.log.error({ error, correlationId }, error.message)

  const statusCode = "statusCode" in error && typeof error.statusCode === "number"
    ? error.statusCode
    : 500

  void reply.status(statusCode).send({
    success: false,
    data: null,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
    correlationId,
  })
}