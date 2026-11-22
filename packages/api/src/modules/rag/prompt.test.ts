import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { buildHybridContext, formatDate, formatHistory, type LiveProject } from "./prompt.js"
import { buildSystemPrompt } from "../chat/gemini.service.js"
import type { RetrievedChunk } from "./retrieve.js"
import { toModelContext } from "../chat/tech-stack.js"
import { MAX_PROMPT_CHARS, MIN_HISTORY_MESSAGES } from "../chat/cost-limits.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
// ! the real system context, so the budget test reflects production size
const system = JSON.stringify(
  toModelContext(
    JSON.parse(readFileSync(join(__dirname, "../chat/portfolio-context.json"), "utf-8"))
  )
)

const RAG_MARKER = "## Retrieved portfolio knowledge\n"

function project(slug: string, title: string, techStack: string[] = []): LiveProject {
  return {
    title,
    slug,
    description: `${title} — ${"description ".repeat(30)}`,
    problem: "p".repeat(150),
    solution: "s".repeat(150),
    impact: null,
    learnings: null,
    techStack,
    repoUrl: `https://github.com/darunbjork/${slug}`,
    liveUrl: null,
    featured: false,
    updatedAt: new Date("2026-11-20T10:00:00Z"),
  }
}

const fillerProjects = Array.from({ length: 18 }, (_, i) =>
  project(`filler-${i}`, `Filler Project ${i}`, ["Cobol"])
)
const voiceAgent = project("voice-agent", "Voice Agent", ["Fastify", "Deepgram"])

const chunks: RetrievedChunk[] = Array.from({ length: 6 }, (_, i) => ({
  content: `chunk-${i} ` + "x".repeat(1_950),
  source: `readme:darunbjork/repo-${i}`,
  similarity: 0.9 - i * 0.05,
  date: "2026-11-21",
}))

const longHistory = Array.from({ length: 10 }, (_, i) => ({
  role: i % 2 === 0 ? "user" : "assistant",
  content: `turn-${i} ` + "h".repeat(1_990),
}))

function ragSection(context: string): string {
  return context.split(RAG_MARKER)[1] ?? ""
}

function promptSize(context: string, history: Array<{ role: string; content: string }>, msg: string): number {
  return context.length + formatHistory(history).length + msg.length
}

describe("buildHybridContext budget", () => {
  it("keeps at least 6000 chars of retrieved chunks with a long history", () => {
    const userMessage = "Tell me about the voice agent. " + "q".repeat(1_900)
    const out = buildHybridContext({
      system,
      projects: [voiceAgent, ...fillerProjects],
      chunks,
      history: longHistory,
      userMessage,
    })

    expect(ragSection(out.context).length).toBeGreaterThanOrEqual(6_000)
    expect(promptSize(out.context, out.history, userMessage)).toBeLessThanOrEqual(MAX_PROMPT_CHARS)
  })

  it("trims the oldest history first but always keeps the last 6 messages", () => {
    const out = buildHybridContext({
      system,
      projects: [voiceAgent, ...fillerProjects],
      chunks,
      history: longHistory,
      userMessage: "What did Darun build with Fastify?",
    })

    expect(out.history.length).toBeGreaterThanOrEqual(MIN_HISTORY_MESSAGES)
    expect(out.history).toEqual(longHistory.slice(-out.history.length))
  })

  it("drops project rows that do not match the question before any RAG chunk", () => {
    const history = longHistory.slice(-6).map((m) => ({ ...m, content: m.content.slice(0, 1_000) }))
    const out = buildHybridContext({
      system,
      projects: [voiceAgent, ...fillerProjects],
      chunks,
      history,
      userMessage: "How does the voice agent use Deepgram?",
    })

    // over budget only because of the 19 project rows: some fillers must go...
    expect(fillerProjects.some((p) => !out.context.includes(`### ${p.title} (`))).toBe(true)
    // ...the matching row stays, and no chunk that fits the RAG cap is cut
    expect(out.context).toContain("### Voice Agent (voice-agent)")
    for (let i = 0; i < 5; i++) expect(out.context).toContain(`chunk-${i} `)
    expect(out.history).toEqual(history)
  })

  it("leaves everything intact when the prompt fits", () => {
    const history = longHistory.slice(-2).map((m) => ({ ...m, content: m.content.slice(0, 100) }))
    const out = buildHybridContext({
      system,
      projects: [voiceAgent, fillerProjects[0]!],
      chunks: chunks.slice(0, 2),
      history,
      userMessage: "Hi",
    })

    expect(out.history).toEqual(history)
    expect(out.context).toContain("### Filler Project 0")
    expect(out.context).toContain("chunk-1 ")
  })
})

describe("every context item carries its date", () => {
  const out = buildHybridContext({
    system,
    systemDate: "2026-11-22",
    projects: [voiceAgent],
    chunks: [
      { content: "README: 969 tests", source: "readme:darunbjork/research-assistant-platform", similarity: 0.8, date: "2026-11-21" },
      { content: "CV: 640+ tests", source: "cv", similarity: 0.7, date: null },
    ],
    history: [],
    userMessage: "How many tests does ResearchBot have?",
  }).context

  it("dates the profile block", () => {
    expect(out).toContain("## Portfolio profile (source=portfolio-context.json date=2026-11-22)")
  })

  it("dates each database project row", () => {
    expect(out).toMatch(/### Voice Agent \(voice-agent\)[\s\S]*Updated: 2026-11-20/)
  })

  it("dates each retrieved chunk next to its source, and marks a missing date", () => {
    expect(out).toContain("[source=readme:darunbjork/research-assistant-platform date=2026-11-21 sim=0.800]")
    expect(out).toContain("[source=cv date=unknown sim=0.700]")
  })

  it("formats dates as YYYY-MM-DD and tolerates bad input", () => {
    expect(formatDate("2026-11-22T23:59:00Z")).toBe("2026-11-22")
    expect(formatDate("not a date")).toBe("unknown")
    expect(formatDate(undefined)).toBe("unknown")
  })
})

describe("system prompt source priority", () => {
  const prompt = buildSystemPrompt("{}")

  it("tells the model to prefer the newest dated source", () => {
    expect(prompt).toContain("SOURCES AND DATES")
    expect(prompt).toMatch(/use the\s+item with the newest date/)
  })

  it("ranks README content above the CV regardless of dates", () => {
    expect(prompt).toMatch(/README content outranks the CV/)
    expect(prompt).toMatch(/"readme:" chunk wins over a\s+"cv" chunk regardless of their dates/)
  })

  it("names the real portfolio URL and no other domain", () => {
    expect(prompt).toContain("https://darun-dev.pages.dev")
    expect(prompt).not.toMatch(/https?:\/\/(www\.)?darun\.dev(?![\w-]|\.[a-z])/)
  })
})
