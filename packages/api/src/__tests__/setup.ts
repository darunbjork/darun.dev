import { afterAll, beforeAll } from "vitest"
import type { FastifyInstance } from "fastify"
import { assertLocalTestEnv } from "./helpers/test-env-guard.js"

// ! Runs before buildApp() connects to anything — see test-env-guard.ts
assertLocalTestEnv()

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
