import type { FastifyInstance } from "fastify"
import {
  TOKEN_BUDGET,
  TOKEN_TTL,
  estimateTokens,
  utcDateKey,
} from "../modules/chat/cost-limits.js"

export type BudgetTier = "session" | "ip" | "global"

export type BudgetCheckResult =
  | { allowed: true }
  | {
      allowed: false
      reason: BudgetTier
      used: number
      limit: number
    }

interface BudgetKeys {
  session: string
  ip: string
  global: string
}

function keys(sessionId: string, ip: string): BudgetKeys {
  const day = utcDateKey()
  return {
    session: `tokens:session:${sessionId}`,
    ip: `tokens:ip:${ip}:${day}`,
    global: `tokens:global:${day}`,
  }
}

async function readInt(
  redis: FastifyInstance["redis"],
  key: string
): Promise<number> {
  const v = await redis.get(key)
  if (v === null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function checkTokenBudget(
  fastify: FastifyInstance,
  opts: { sessionId: string; ip: string; estimatedTokens: number }
): Promise<BudgetCheckResult> {
  const { sessionId, ip, estimatedTokens } = opts
  const k = keys(sessionId, ip)
  const redis = fastify.redis

  const [sessionUsed, ipUsed, globalUsed] = await Promise.all([
    readInt(redis, k.session),
    readInt(redis, k.ip),
    readInt(redis, k.global),
  ])

  if (sessionUsed + estimatedTokens > TOKEN_BUDGET.session) {
    return {
      allowed: false,
      reason: "session",
      used: sessionUsed,
      limit: TOKEN_BUDGET.session,
    }
  }
  if (ipUsed + estimatedTokens > TOKEN_BUDGET.ipDay) {
    return {
      allowed: false,
      reason: "ip",
      used: ipUsed,
      limit: TOKEN_BUDGET.ipDay,
    }
  }
  if (globalUsed + estimatedTokens > TOKEN_BUDGET.globalDay) {
    return {
      allowed: false,
      reason: "global",
      used: globalUsed,
      limit: TOKEN_BUDGET.globalDay,
    }
  }

  return { allowed: true }
}

export async function recordTokenUsage(
  fastify: FastifyInstance,
  opts: { sessionId: string; ip: string; tokens: number }
): Promise<void> {
  const tokens = Math.max(0, Math.floor(opts.tokens))
  if (tokens === 0) return

  const k = keys(opts.sessionId, opts.ip)
  const redis = fastify.redis

  await Promise.all([
    redis.incrby(k.session, tokens),
    redis.incrby(k.ip, tokens),
    redis.incrby(k.global, tokens),
  ])

  await Promise.all([
    redis.expire(k.session, TOKEN_TTL.sessionSeconds),
    redis.expire(k.ip, TOKEN_TTL.dailySeconds),
    redis.expire(k.global, TOKEN_TTL.dailySeconds),
  ])
}

export function estimateMessageBudget(userText: string): number {
  return estimateTokens(userText) + 800
}