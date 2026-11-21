import { env } from "../env.js"

// ! One LLM call through a provider chain:
// !   GEMINI_MODEL → GEMINI_FALLBACK_MODEL → Groq (GROQ_MODEL, only with GROQ_API_KEY)
// ! 503/overloaded: the primary is retried once, then the chain moves on.
// ! Timeout and 404: move on (a 404 is logged as an error — the model name is wrong).
// ! 429: quota — no retry on that model, warn, move on.
// ! Anything else (400, bad key, …): thrown without falling back.
// ! Everything runs inside one wall-clock budget so chat can serve its cached
// ! fallback instead of leaving visitors waiting.

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
const GROQ_BASE_URL = "https://api.groq.com/openai/v1"

const PRIMARY_ATTEMPTS = 2
const PRIMARY_BACKOFF_MS = [2000]
const PER_CALL_TIMEOUT_MS = 15_000
const TOTAL_BUDGET_MS = 20_000
const PROBE_PROMPT = "Reply with just OK"

export type LlmProvider = "gemini" | "groq"
export type LlmLink = { provider: LlmProvider; model: string }

export type GeminiConfig = {
  maxOutputTokens: number
  temperature: number
  responseMimeType: "application/json" | "text/plain"
}

export type GeminiResult = {
  text: string
  provider: LlmProvider
  model: string
  attempts: number
}

type FailureKind = "unavailable" | "timeout" | "not_found" | "quota" | "fatal"

type LlmLogger = {
  info: (obj: object, msg?: string) => void
  warn: (obj: object, msg?: string) => void
  error: (obj: object, msg?: string) => void
}

let logger: LlmLogger = {
  info: (obj, msg) => console.info(msg, obj),
  warn: (obj, msg) => console.warn(msg, obj),
  error: (obj, msg) => console.error(msg, obj),
}

/** Route LLM logs through Fastify's logger (called once from buildApp). */
export function setLlmLogger(next: LlmLogger): void {
  logger = next
}

class LlmHttpError extends Error {
  constructor(
    readonly status: number,
    readonly provider: LlmProvider,
    readonly model: string,
    body: string
  ) {
    super(`${provider} ${model} ${status}: ${body.slice(0, 300)}`)
    this.name = "LlmHttpError"
  }
}

export function llmChain(): LlmLink[] {
  const chain: LlmLink[] = [{ provider: "gemini", model: env.GEMINI_MODEL }]
  const fallback = env.GEMINI_FALLBACK_MODEL.trim()
  if (fallback.length > 0 && fallback !== env.GEMINI_MODEL) {
    chain.push({ provider: "gemini", model: fallback })
  }
  if (env.GROQ_API_KEY) chain.push({ provider: "groq", model: env.GROQ_MODEL })
  return chain
}

function classify(err: unknown): { kind: FailureKind; status?: number } {
  if (err instanceof LlmHttpError) {
    if (err.status === 404) return { kind: "not_found", status: 404 }
    if (err.status === 429) return { kind: "quota", status: 429 }
    if (err.status >= 500) return { kind: "unavailable", status: err.status }
    return { kind: "fatal", status: err.status }
  }
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") return { kind: "timeout" }
    // undici network failure (DNS, reset, refused)
    if (err.name === "TypeError" && /fetch failed/i.test(err.message)) return { kind: "unavailable" }
  }
  return { kind: "fatal" }
}

async function callGeminiModel(
  model: string,
  prompt: string,
  config: GeminiConfig,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature,
          responseMimeType: config.responseMimeType,
        },
      }),
      signal,
    }
  )
  if (!res.ok) {
    throw new LlmHttpError(res.status, "gemini", model, await res.text().catch(() => res.statusText))
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>
  }
  // ! skip thought parts — same as the SDK's response.text
  return (data.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => p.thought !== true)
    .map((p) => p.text ?? "")
    .join("")
}

async function callGroqModel(
  model: string,
  prompt: string,
  config: GeminiConfig,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature,
      max_completion_tokens: config.maxOutputTokens,
      // JSON mode needs the word "JSON" in the prompt; every caller's prompt has it
      ...(config.responseMimeType === "application/json"
        ? { response_format: { type: "json_object" } }
        : {}),
      // same as voice-agent: gpt-oss reasons briefly, reasoning text not returned
      ...(model.startsWith("openai/gpt-oss")
        ? { reasoning_effort: "low", include_reasoning: false }
        : {}),
    }),
    signal,
  })
  if (!res.ok) {
    throw new LlmHttpError(res.status, "groq", model, await res.text().catch(() => res.statusText))
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string | null } }> }
  return data.choices?.[0]?.message?.content ?? ""
}

function callLink(link: LlmLink, prompt: string, config: GeminiConfig, signal: AbortSignal): Promise<string> {
  return link.provider === "gemini"
    ? callGeminiModel(link.model, prompt, config, signal)
    : callGroqModel(link.model, prompt, config, signal)
}

function logFailure(link: LlmLink, kind: FailureKind, status: number | undefined, err: unknown): void {
  const base = { provider: link.provider, model: link.model, status }
  if (kind === "not_found") {
    logger.error({ event: "llm_model_not_found", ...base }, "configured LLM model returned 404 — check the model name")
  } else if (kind === "quota") {
    logger.warn({ event: "llm_quota", ...base }, "LLM quota exhausted (429) — trying the next model")
  } else if (kind === "unavailable" || kind === "timeout") {
    logger.warn({ event: "llm_unavailable", kind, ...base, err: String(err) }, "LLM unavailable — trying the next model")
  }
}

/**
 * One LLM completion through the provider chain (name kept for the existing
 * callers; the answer may come from Groq — see `provider` on the result).
 */
export async function callGemini(prompt: string, config: GeminiConfig): Promise<GeminiResult> {
  const deadline = Date.now() + TOTAL_BUDGET_MS
  let attempts = 0
  let lastErr: unknown = new Error("No LLM configured")

  for (const [index, link] of llmChain().entries()) {
    const maxAttempts = index === 0 ? PRIMARY_ATTEMPTS : 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw lastErr
      attempts++
      const started = Date.now()
      try {
        const text = await callLink(
          link,
          prompt,
          config,
          AbortSignal.timeout(Math.min(PER_CALL_TIMEOUT_MS, remaining))
        )
        logger.info(
          { event: "llm_answered", provider: link.provider, model: link.model, attempts, ms: Date.now() - started },
          "LLM answered"
        )
        return { text, provider: link.provider, model: link.model, attempts }
      } catch (err) {
        lastErr = err
        const { kind, status } = classify(err)
        if (kind === "fatal") throw err
        logFailure(link, kind, status, err)
        const retrySameModel = kind === "unavailable" && attempt < maxAttempts - 1
        if (!retrySameModel) break
        const delay = Math.min(PRIMARY_BACKOFF_MS[attempt] ?? 2000, deadline - Date.now())
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastErr
}

// ── Startup check ────────────────────────────────────────────────────────────

export type LlmProbeStatus = "ok" | "not_found" | "quota" | "unavailable" | "timeout" | "error"

export type LlmProbeResult = {
  checkedAt: string | null
  models: Array<{
    provider: LlmProvider
    model: string
    status: LlmProbeStatus
    httpStatus?: number
    latencyMs: number
  }>
}

let lastProbe: LlmProbeResult = { checkedAt: null, models: [] }

export function getLlmHealth(): LlmProbeResult {
  return lastProbe
}

/**
 * Calls every configured model once with a tiny prompt. Never throws: a 404 is
 * logged as an error, other failures as warnings, and the result is kept for
 * /health.
 */
export async function probeLlmModels(): Promise<LlmProbeResult> {
  const probeConfig: GeminiConfig = { maxOutputTokens: 64, temperature: 0, responseMimeType: "text/plain" }

  const models = await Promise.all(
    llmChain().map(async (link) => {
      const started = Date.now()
      try {
        await callLink(link, PROBE_PROMPT, probeConfig, AbortSignal.timeout(PER_CALL_TIMEOUT_MS))
        return { ...link, status: "ok" as const, latencyMs: Date.now() - started }
      } catch (err) {
        const { kind, status } = classify(err)
        const latencyMs = Date.now() - started
        if (kind === "fatal") {
          logger.error({ event: "llm_probe_failed", ...link, status, err: String(err) }, "LLM startup check failed")
        } else {
          logFailure(link, kind, status, err)
        }
        return {
          ...link,
          status: (kind === "fatal" ? "error" : kind) as LlmProbeStatus,
          ...(status !== undefined ? { httpStatus: status } : {}),
          latencyMs,
        }
      }
    })
  )

  lastProbe = { checkedAt: new Date().toISOString(), models }
  return lastProbe
}
