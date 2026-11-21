import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { parseStack, toModelContext } from "./tech-stack.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const shipped = JSON.parse(
  readFileSync(join(__dirname, "portfolio-context.json"), "utf-8")
) as { stack: unknown }

const voiceAgent = {
  repo: "voice-agent",
  url: "https://github.com/darunbjork/voice-agent",
  evidence: "Fastify API with WebSocket audio routes",
}

describe("parseStack", () => {
  it("rejects a technology with an empty provenBy", () => {
    expect(() =>
      parseStack({ backend: [{ name: "Fastify", provenBy: [] }] })
    ).toThrow(/backend\.0\.provenBy/)
  })

  it("rejects a technology with no provenBy at all", () => {
    expect(() => parseStack({ backend: [{ name: "Fastify" }] })).toThrow(
      /provenBy/
    )
  })

  it("rejects a url that is not the named darunbjork repo", () => {
    expect(() =>
      parseStack({
        backend: [
          {
            name: "Fastify",
            provenBy: [{ ...voiceAgent, url: "https://github.com/someone/voice-agent" }],
          },
        ],
      })
    ).toThrow(/url/)
  })

  it("accepts a technology proven by a repo", () => {
    const stack = parseStack({
      backend: [{ name: "Fastify", provenBy: [voiceAgent] }],
    })
    expect(stack.backend?.[0]?.provenBy[0]?.repo).toBe("voice-agent")
  })

  it("validates the shipped portfolio-context.json stack", () => {
    const stack = parseStack(shipped.stack)
    const names = Object.values(stack).flat().map((t) => t.name)
    for (const unproven of ["Zustand", "Framer Motion", "Render", "BM25 keyword search"]) {
      expect(names).not.toContain(unproven)
    }
  })
})

describe("toModelContext", () => {
  it("lists every proving repo once with its link and keeps the evidence", () => {
    const out = toModelContext({
      profile: { name: "x" },
      stack: {
        backend: [
          { name: "Fastify", provenBy: [voiceAgent] },
          { name: "WebSockets", provenBy: [voiceAgent] },
        ],
      },
    })

    expect(out.profile).toEqual({ name: "x" })
    expect(out.repoLinks).toEqual({
      "voice-agent": "https://github.com/darunbjork/voice-agent",
    })
    expect(out.stack).toEqual({
      backend: [
        "Fastify — voice-agent: Fastify API with WebSocket audio routes",
        "WebSockets — voice-agent: Fastify API with WebSocket audio routes",
      ],
    })
  })
})
