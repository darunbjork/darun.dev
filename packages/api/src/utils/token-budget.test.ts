import { afterEach, describe, expect, it } from "vitest"
import { app } from "../__tests__/setup.js"
import { TOKEN_BUDGET, utcDateKey } from "../modules/chat/cost-limits.js"
import { checkTokenBudget, recordTokenUsage } from "./token-budget.js"

const sessionId = `budget-test-${Date.now()}`
const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`

afterEach(async () => {
  await app.redis.del(`tokens:session:${sessionId}`, `tokens:ip:${ip}:${utcDateKey()}`)
})

describe("session token budget", () => {
  it("is 100,000 tokens per session", () => {
    expect(TOKEN_BUDGET.session).toBe(100_000)
  })

  it("still allows a message after 60k tokens in one session", async () => {
    await recordTokenUsage(app, { sessionId, ip, tokens: 60_000 })

    const result = await checkTokenBudget(app, { sessionId, ip, estimatedTokens: 5_000 })

    expect(result).toEqual({ allowed: true })
  })

  it("rejects a message that would take the session past 100k", async () => {
    await recordTokenUsage(app, { sessionId, ip, tokens: 99_000 })

    const result = await checkTokenBudget(app, { sessionId, ip, estimatedTokens: 5_000 })

    expect(result).toEqual({ allowed: false, reason: "session", used: 99_000, limit: 100_000 })
  })
})
