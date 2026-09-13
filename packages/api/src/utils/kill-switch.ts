import type { FastifyInstance } from "fastify"

const FLAG = "chat:disabled"

export async function isChatDisabled(fastify: FastifyInstance): Promise<boolean> {
  const flag = await fastify.redis.get(FLAG)
  return flag === "1"
}

export async function setChatDisabled(fastify: FastifyInstance, disabled: boolean): Promise<void> {
  if (disabled) await fastify.redis.set(FLAG, "1")
  else await fastify.redis.del(FLAG)
}