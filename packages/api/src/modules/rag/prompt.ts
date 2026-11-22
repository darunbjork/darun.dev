import type { RetrievedChunk } from "./retrieve.js"
import {
  MAX_PROMPT_CHARS,
  MAX_RAG_CONTEXT_CHARS,
  MIN_HISTORY_MESSAGES,
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
  updatedAt: Date | string
}

export type HistoryMessage = { role: string; content: string }

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : []
}

/** YYYY-MM-DD, or "unknown" for a missing/invalid date */
export function formatDate(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) return "unknown"
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? "unknown" : d.toISOString().slice(0, 10)
}

function formatProject(p: LiveProject): string {
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
    `Updated: ${formatDate(p.updatedAt)}`,
  ]
    .filter((line) => line.length > 0)
    .join("\n")
}

export function formatSqlProjects(projects: LiveProject[]): string {
  if (projects.length === 0) {
    return "No published projects in the database."
  }
  return projects.map(formatProject).join("\n\n")
}

function ragBlocks(chunks: RetrievedChunk[]): string[] {
  const blocks: string[] = []
  let size = 0
  for (const c of chunks) {
    const block = `[source=${c.source} date=${c.date ?? "unknown"} sim=${c.similarity.toFixed(3)}]\n${c.content}`
    if (size + block.length + 2 > MAX_RAG_CONTEXT_CHARS) break
    blocks.push(block)
    size += block.length + 2
  }
  return blocks
}

export function formatRagChunks(chunks: RetrievedChunk[]): string {
  return ragBlocks(chunks).join("\n\n")
}

/** The exact history text the Gemini prompt contains — counted with the same formatter. */
export function formatHistory(history: HistoryMessage[]): string {
  return history.map((m) => `${m.role}: ${m.content}`).join("\n")
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim()
}

/** A row matches when the question names its title, slug or one of its technologies. */
function projectMatches(p: LiveProject, question: string): boolean {
  const q = ` ${normalize(question)} `
  return [p.title, p.slug.replace(/[-_]/g, " "), ...asStringArray(p.techStack)]
    .map(normalize)
    .filter((term) => term.length >= 2)
    .some((term) => q.includes(` ${term} `))
}

/**
 * Builds the context block for the Gemini prompt and the history to send with
 * it, keeping system + projects + RAG + history + message within
 * MAX_PROMPT_CHARS. When over budget it trims, in order:
 *   1. oldest chat history, never below MIN_HISTORY_MESSAGES
 *   2. project rows that do not match the question (lowest-priority first)
 *   3. RAG chunks (lowest similarity first)
 *   4. as a last resort, the remaining (matching) project rows
 */
export function buildHybridContext(opts: {
  system: string
  /** portfolio-context.json "lastUpdated" — dates the profile block */
  systemDate?: string
  projects: LiveProject[]
  chunks: RetrievedChunk[]
  history: HistoryMessage[]
  userMessage: string
}): { context: string; history: HistoryMessage[] } {
  const history = [...opts.history]
  const rows = opts.projects.map((p) => ({
    text: formatProject(p),
    matches: projectMatches(p, opts.userMessage),
  }))
  const rag = ragBlocks(opts.chunks)

  const render = (): string => {
    const omitted = opts.projects.length - rows.length
    const projectsText =
      opts.projects.length === 0
        ? "No published projects in the database."
        : [
            rows.map((r) => r.text).join("\n\n"),
            omitted > 0 ? `(${omitted} more published projects omitted to fit the prompt)` : "",
          ]
            .filter((s) => s.length > 0)
            .join("\n\n")
    return [
      `## Portfolio profile (source=portfolio-context.json date=${formatDate(opts.systemDate)})`,
      opts.system,
      "",
      "## Live projects (source=database; each row has its Updated date)",
      projectsText,
      "",
      "## Retrieved portfolio knowledge",
      rag.length > 0 ? rag.join("\n\n") : "(no chunks retrieved)",
    ].join("\n")
  }

  const overBudget = (): boolean =>
    render().length + formatHistory(history).length + opts.userMessage.length >
    MAX_PROMPT_CHARS

  while (overBudget() && history.length > MIN_HISTORY_MESSAGES) {
    history.shift()
  }
  while (overBudget()) {
    const idx = rows.map((r) => r.matches).lastIndexOf(false)
    if (idx === -1) break
    rows.splice(idx, 1)
  }
  while (overBudget() && rag.length > 0) {
    rag.pop()
  }
  while (overBudget() && rows.length > 0) {
    rows.pop()
  }

  return { context: render(), history }
}
