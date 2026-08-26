import { afterAll, beforeAll } from "vitest"
import { buildApp } from "../app.js"
import type { FastifyInstance } from "fastify"

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

export { app }