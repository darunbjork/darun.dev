import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify"
import { randomUUID } from "crypto"

declare module "fastify" {
  interface FastifyRequest {
    correlationId: string
  }
}

export function correlationId(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const existing = request.headers["x-correlation-id"]
  const id = typeof existing === "string" ? existing : randomUUID()

  request.correlationId = id
  reply.header("X-Correlation-ID", id)

  request.log = request.log.child({ correlationId: id })

  done()
}