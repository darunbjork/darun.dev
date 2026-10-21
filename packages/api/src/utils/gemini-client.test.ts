import { describe, it, expect, vi } from "vitest"

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}))

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock }
  },
}))

import { callGemini } from "./gemini-client.js"

const config = {
  maxOutputTokens: 64,
  temperature: 0.2,
  responseMimeType: "text/plain" as const,
}

function highDemand() {
  return Object.assign(
    new Error("This model is currently experiencing high demand."),
    { status: 503 }
  )
}

describe("callGemini retry budget", () => {
  it("answers on the first attempt without retrying", async () => {
    generateContentMock.mockReset()
    generateContentMock.mockResolvedValueOnce({ text: "hello" })

    const out = await callGemini("hi", config)

    expect(out.text).toBe("hello")
    expect(out.attempts).toBe(1)
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })

  it("gives up within the fail-fast budget when models report high demand", async () => {
    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async () => {
      throw highDemand()
    })
    const started = Date.now()

    await expect(callGemini("hi", config)).rejects.toThrow(/high demand/)

    const elapsed = Date.now() - started
    expect(generateContentMock.mock.calls.length).toBeLessThanOrEqual(3)
    expect(elapsed).toBeGreaterThanOrEqual(2000)
    expect(elapsed).toBeLessThan(6000)
  })

  it("does not retry non-retryable errors", async () => {
    generateContentMock.mockReset()
    generateContentMock.mockImplementation(async () => {
      throw Object.assign(new Error("API key not valid"), { status: 400 })
    })

    await expect(callGemini("hi", config)).rejects.toThrow(/API key not valid/)
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })
})
