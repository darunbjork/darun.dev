import type { FastifyInstance } from "fastify"
import fp from "fastify-plugin"

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string
  }
}

export const rawBodyPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        const raw = typeof body === "string" ? body : body.toString("utf8")
        ;(req as { rawBody?: string }).rawBody = raw
        const json = raw.length > 0 ? JSON.parse(raw) : {}
        done(null, json)
      } catch (err) {
        done(err as Error, undefined)
      }
    }
  )
})