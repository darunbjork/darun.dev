import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { env } from "../env.js"
import {
  callGemini,
  getLlmHealth,
  llmChain,
  probeLlmModels,
  setLlmLogger,
} from "./gemini-client.js"

// ! every provider is called through fetch — mock it, never hit the network
const fetchMock = vi.fn<typeof fetch>()
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

const PRIMARY = "gemini-3.6-flash"
const FALLBACK = "gemini-3.1-flash-lite"
const GROQ = "openai/gpt-oss-120b"

const json = { maxOutputTokens: 64, temperature: 0.2, responseMimeType: "application/json" as const }

function geminiOk(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: "thinking…", thought: true }, { text }] } }],
    }),
    { status: 200 }
  )
}
function groqOk(text: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 })
}
function status(code: number, body = `{"error":{"code":${code}}}`): Response {
  return new Response(body, { status: code })
}
function modelOf(call: Parameters<typeof fetch>): string {
  const url = String(call[0])
  if (url.includes("api.groq.com")) {
    return (JSON.parse(String(call[1]?.body)) as { model: string }).model
  }
  return decodeURIComponent(url.split("/models/")[1]!.split(":")[0]!)
}
function calledModels(): string[] {
  return fetchMock.mock.calls.map(modelOf)
}
/** Route responses per model: each model gets its own queue. */
function routeByModel(responses: Record<string, Array<Response | Error>>): void {
  fetchMock.mockImplementation(async (...args) => {
    const next = responses[modelOf(args)]?.shift()
    if (next === undefined) throw new Error(`unexpected call to ${modelOf(args)}`)
    if (next instanceof Error) throw next
    return next
  })
}

const savedGroqKey = env.GROQ_API_KEY

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  logger.info.mockReset()
  logger.warn.mockReset()
  logger.error.mockReset()
  setLlmLogger(logger)
  env.GROQ_API_KEY = undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
  env.GROQ_API_KEY = savedGroqKey
})

describe("llmChain", () => {
  it("reads models from env and adds Groq only when GROQ_API_KEY is set", () => {
    expect(llmChain()).toEqual([
      { provider: "gemini", model: PRIMARY },
      { provider: "gemini", model: FALLBACK },
    ])
    env.GROQ_API_KEY = "gsk_test"
    expect(llmChain().at(-1)).toEqual({ provider: "groq", model: GROQ })
  })
})

describe("callGemini fallback chain", () => {
  it("answers from the primary model and logs the provider", async () => {
    routeByModel({ [PRIMARY]: [geminiOk("hello")] })

    const out = await callGemini("hi", json)

    expect(out).toEqual({ text: "hello", provider: "gemini", model: PRIMARY, attempts: 1 })
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: "llm_answered", provider: "gemini", model: PRIMARY }),
      expect.any(String)
    )
  })

  it("falls back to Groq when the fallback model returns 404", async () => {
    env.GROQ_API_KEY = "gsk_test"
    routeByModel({
      [PRIMARY]: [status(503), status(503)],
      [FALLBACK]: [status(404)],
      [GROQ]: [groqOk('{"ok":true}')],
    })

    const out = await callGemini("hi", json)

    expect(out).toMatchObject({ text: '{"ok":true}', provider: "groq", model: GROQ, attempts: 4 })
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "llm_model_not_found", model: FALLBACK, status: 404 }),
      expect.any(String)
    )
  }, 10_000)

  it("does not retry a 404 primary and moves straight to the fallback", async () => {
    routeByModel({ [PRIMARY]: [status(404)], [FALLBACK]: [geminiOk("from lite")] })

    const out = await callGemini("hi", json)

    expect(out).toMatchObject({ text: "from lite", model: FALLBACK, attempts: 2 })
    expect(calledModels()).toEqual([PRIMARY, FALLBACK])
  })

  it("falls back on a timeout without retrying the timed-out model", async () => {
    routeByModel({
      [PRIMARY]: [new DOMException("The operation timed out.", "TimeoutError")],
      [FALLBACK]: [geminiOk("fast answer")],
    })

    const out = await callGemini("hi", json)

    expect(out.model).toBe(FALLBACK)
    expect(calledModels()).toEqual([PRIMARY, FALLBACK])
  })

  it("treats 429 as quota: no retry, warns, and uses the next model", async () => {
    routeByModel({ [PRIMARY]: [status(429)], [FALLBACK]: [geminiOk("ok")] })

    const out = await callGemini("hi", json)

    expect(out.model).toBe(FALLBACK)
    expect(calledModels()).toEqual([PRIMARY, FALLBACK])
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "llm_quota", model: PRIMARY, status: 429 }),
      expect.any(String)
    )
  })

  it("does not fall back on a non-retryable error such as 400", async () => {
    routeByModel({ [PRIMARY]: [status(400, "API key not valid")] })

    await expect(callGemini("hi", json)).rejects.toThrow(/API key not valid/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("gives up within the fail-fast budget when every model reports high demand", async () => {
    fetchMock.mockImplementation(async () => status(503, "This model is currently experiencing high demand."))
    const started = Date.now()

    await expect(callGemini("hi", json)).rejects.toThrow(/high demand/)

    const elapsed = Date.now() - started
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3)
    expect(elapsed).toBeGreaterThanOrEqual(2000)
    expect(elapsed).toBeLessThan(6000)
  }, 10_000)

  it("sends Groq an OpenAI-compatible JSON-mode request with the key as a bearer token", async () => {
    env.GROQ_API_KEY = "gsk_test"
    routeByModel({ [PRIMARY]: [status(404)], [FALLBACK]: [status(404)], [GROQ]: [groqOk("{}")] })

    await callGemini("Respond with JSON", json)

    const [url, init] = fetchMock.mock.calls.at(-1)!
    expect(String(url)).toBe("https://api.groq.com/openai/v1/chat/completions")
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer gsk_test")
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: GROQ,
      messages: [{ role: "user", content: "Respond with JSON" }],
      max_completion_tokens: 64,
      response_format: { type: "json_object" },
      reasoning_effort: "low",
    })
  })
})

describe("probeLlmModels (startup check)", () => {
  it("reports each configured model, logs an error for a 404, and never throws", async () => {
    env.GROQ_API_KEY = "gsk_test"
    routeByModel({
      [PRIMARY]: [geminiOk("OK")],
      [FALLBACK]: [status(404)],
      [GROQ]: [new TypeError("fetch failed")],
    })

    const result = await probeLlmModels()

    expect(result.models.map((m) => [m.model, m.status])).toEqual([
      [PRIMARY, "ok"],
      [FALLBACK, "not_found"],
      [GROQ, "unavailable"],
    ])
    expect(result.models[1]).toMatchObject({ provider: "gemini", httpStatus: 404 })
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "llm_model_not_found", model: FALLBACK }),
      expect.any(String)
    )
    expect(getLlmHealth()).toEqual(result)
    expect(result.checkedAt).not.toBeNull()
  })
})
