import type { FastifyError, FastifyRequest, FastifyReply } from "fastify"
import { AppError } from "../utils/errors.js"
import { fail } from "../utils/response.js"

export function errorHandler(
  error: FastifyError | Error | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const correlationId = request.correlationId ?? "unknown"

  if ("validation" in error && error.validation !== undefined) {
    request.log.warn({ error, correlationId }, "Validation error")
    void reply.status(400).send(fail(error.message, correlationId))
    return
  }

  if (error instanceof AppError) {
    request.log.warn({ error, correlationId, code: error.code }, error.message)
    void reply.status(error.statusCode).send(fail(error.message, correlationId))
    return
  }

  const statusCode =
    typeof (error as FastifyError).statusCode === "number" &&
    (error as FastifyError).statusCode! >= 400 &&
    (error as FastifyError).statusCode! < 500
      ? (error as FastifyError).statusCode!
      : 500

  if (statusCode === 500) {
    request.log.error({ error, correlationId }, "Unexpected error")
  } else {
    request.log.warn({ error, correlationId, statusCode }, "Client error")
  }

  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : error.message

  void reply.status(statusCode).send(fail(message, correlationId))
}