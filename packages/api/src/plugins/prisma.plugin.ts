import fp from "fastify-plugin"
import type { FastifyPluginAsync } from "fastify"
import { PrismaClient } from "../generated/prisma/client.js" 
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "../env.js"

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  })

  const prisma = new PrismaClient({
    adapter,
    log: fastify.log.level === "debug"
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"],
  })

  await prisma.$connect()
  fastify.log.info("Prisma connected (adapter-pg)")

  fastify.decorate("prisma", prisma)

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect()
    fastify.log.info("Prisma disconnected")
  })
}

export { prismaPlugin }
export default fp(prismaPlugin, { name: "prisma" })