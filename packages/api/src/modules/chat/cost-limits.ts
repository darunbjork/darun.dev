export const MESSAGE_MAX_CHARS = 2000
export const MAX_OUTPUT_TOKENS = 1500
export const MAX_RAG_CONTEXT_CHARS = 12_000
export const MAX_PROMPT_CHARS = 24_000

export const TOKEN_BUDGET = {
  session: 50_000,
  ipDay: 200_000,
  globalDay: 1_000_000,
} as const

export const TOKEN_TTL = {
  sessionSeconds: 60 * 60 * 24 * 7,
  dailySeconds: 60 * 60 * 24 * 30,
} as const

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}