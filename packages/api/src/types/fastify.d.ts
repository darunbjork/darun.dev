import type { PrismaClient } from "../generated/prisma/client.js"
import type { Redis } from "ioredis"

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient
    redis:  Redis
  }

  interface FastifyRequest {
    correlationId: string
    adminId?: string
  }
}