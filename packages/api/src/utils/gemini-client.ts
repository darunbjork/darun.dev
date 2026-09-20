import { GoogleGenAI } from "@google/genai"
import { env } from "../env.js"

const PRIMARY_MODEL = "gemini-3.6-flash"
const FALLBACK_MODEL = "gemini-3.6-pro"
const PRIMARY_ATTEMPTS = 4
const FALLBACK_ATTEMPTS = 2
const PRIMARY_BACKOFF_MS = [2000, 4000, 8000, 12000]
const FALLBACK_BACKOFF_MS = [2000, 4000]

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

export type GeminiConfig = {
  maxOutputTokens: number
  temperature: number
  responseMimeType: "application/json" | "text/plain"
}

export type GeminiResult = {
  text: string
  model: string
  attempts: number
}

function isRetryable(err: unknown): boolean {
  if (err === null || typeof err !== "object") return false
  const e = err as { status?: unknown; message?: unknown; code?: unknown }
  const status = typeof e.status === "number" ? e.status : Number(e.code)
  if (status === 503 || status === 429) return true
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : ""
  if (msg.includes("unavailable")) return true
  if (msg.includes("high demand")) return true
  if (msg.includes("overloaded")) return true
  if (msg.includes("deadline")) return true
  return false
}

async function tryModel(
  model: string,
  prompt: string,
  config: GeminiConfig,
  maxAttempts: number,
  backoff: number[],
): Promise<{ text: string; attempts: number }> {
  let lastErr: unknown = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature,
          responseMimeType: config.responseMimeType,
        },
      })
      return { text: result.text ?? "", attempts: attempt + 1 }
    } catch (err) {
      lastErr = err
      if (!isRetryable(err)) throw err
      if (attempt < maxAttempts - 1) {
        const delay = backoff[attempt] ?? 4000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastErr ?? new Error("Gemini call failed")
}

export async function callGemini(
  prompt: string,
  config: GeminiConfig,
): Promise<GeminiResult> {
  try {
    const primary = await tryModel(
      PRIMARY_MODEL,
      prompt,
      config,
      PRIMARY_ATTEMPTS,
      PRIMARY_BACKOFF_MS,
    )
    return { text: primary.text, model: PRIMARY_MODEL, attempts: primary.attempts }
  } catch (primaryErr) {
    if (!isRetryable(primaryErr)) throw primaryErr

    try {
      const fallback = await tryModel(
        FALLBACK_MODEL,
        prompt,
        config,
        FALLBACK_ATTEMPTS,
        FALLBACK_BACKOFF_MS,
      )
      return {
        text: fallback.text,
        model: FALLBACK_MODEL,
        attempts: PRIMARY_ATTEMPTS + fallback.attempts,
      }
    } catch {
      throw primaryErr
    }
  }
}
