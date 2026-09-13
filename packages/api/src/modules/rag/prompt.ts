import type { RetrievedChunk } from "./retrieve.js"
import {
  MAX_PROMPT_CHARS,
  MAX_RAG_CONTEXT_CHARS,
} from "../chat/cost-limits.js"

export type LiveProject = {
  title: string
  slug: string
  description: string | null
  problem: string | null
  solution: string | null
  impact: string | null
  learnings: string | null
  techStack: unknown
  repoUrl: string | null
  liveUrl: string | null
  featured: boolean
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : []
}

export function formatSqlProjects(projects: LiveProject[]): string {
  if (projects.length === 0) {
    return "No published projects in the database."
  }
  return projects
    .map((p) => {
      const tech = asStringArray(p.techStack).join(", ")
      return [
        `### ${p.title} (${p.slug})${p.featured ? " [featured]" : ""}`,
        p.description ?? "",
        p.problem ? `Problem: ${p.problem}` : "",
        p.solution ? `Solution: ${p.solution}` : "",
        p.impact ? `Impact: ${p.impact}` : "",
        p.learnings ? `Learnings: ${p.learnings}` : "",
        tech ? `Tech: ${tech}` : "",
        p.repoUrl ? `Repo: ${p.repoUrl}` : "",
        p.liveUrl ? `Live: ${p.liveUrl}` : "",
      ]
        .filter((line) => line.length > 0)
        .join("\n")
    })
    .join("\n\n")
}

export function formatRagChunks(chunks: RetrievedChunk[]): string {
  let out = ""
  for (const c of chunks) {
    const block = `[source=${c.source} sim=${c.similarity.toFixed(3)}]\n${c.content}`
    if (out.length + block.length + 2 > MAX_RAG_CONTEXT_CHARS) break
    out += (out.length > 0 ? "\n\n" : "") + block
  }
  return out
}

/**
 * Returns the context block that replaces the old `contextState.json` in the
 * Gemini prompt. Trims RAG first, then SQL, to stay under MAX_PROMPT_CHARS.
 */
export function buildHybridContext(opts: {
  system: string
  sqlContext: string
  rag: string
  historyBlock: string
  userMessage: string
}): string {
  let rag = opts.rag
  let sqlContext = opts.sqlContext

  const portfolio = (): string =>
    [
      "## Live projects (database)",
      sqlContext,
      "",
      "## Retrieved portfolio knowledge",
      rag.length > 0 ? rag : "(no chunks retrieved)",
    ].join("\n")

  const total = (): number =>
    opts.system.length +
    portfolio().length +
    opts.historyBlock.length +
    opts.userMessage.length

  while (total() > MAX_PROMPT_CHARS && rag.length > 0) {
    rag = rag.slice(0, Math.floor(rag.length * 0.8))
  }
  while (total() > MAX_PROMPT_CHARS && sqlContext.length > 0) {
    sqlContext = sqlContext.slice(0, Math.floor(sqlContext.length * 0.8))
  }

  return [opts.system, "", portfolio()].join("\n")
}