import { afterAll, beforeAll } from "vitest"
import type { FastifyInstance } from "fastify"

let app: FastifyInstance

beforeAll(async () => {
  const { buildApp } = await import("../app.js")
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

export { app }
