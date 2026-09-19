import { GoogleGenAI } from "@google/genai"
import { env } from "../env.js"

const PRIMARY_MODEL = "gemini-3.6-flash"
const FALLBACK_MODEL = "gemini-2.5-flash"
const MAX_ATTEMPTS_PER_MODEL = 2
const BACKOFF_MS = [1000, 2000]

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
): Promise<string> {
  let lastErr: unknown = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
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
      return result.text ?? ""
    } catch (err) {
      lastErr = err
      if (!isRetryable(err)) throw err
      if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
        const delay = BACKOFF_MS[attempt] ?? 2000
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
    const text = await tryModel(PRIMARY_MODEL, prompt, config)
    return { text, model: PRIMARY_MODEL, attempts: 1 }
  } catch (primaryErr) {
    if (!isRetryable(primaryErr)) throw primaryErr
    const text = await tryModel(FALLBACK_MODEL, prompt, config)
    return { text, model: FALLBACK_MODEL, attempts: 2 }
  }
}
