import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ! Corrections for the DB `projects` rows the chatbot reads as "Live projects".
// ! The facts come from portfolio-context.json so the file and the DB cannot drift.
// ! Pure: plans the writes; scripts/apply-project-corrections.ts performs them.

export const PORTFOLIO_URL = "https://darun-dev.pages.dev"
const UNOWNED_PORTFOLIO_URL = /https?:\/\/(www\.)?darun\.dev(?![\w-]|\.[a-z])/g

export type ProjectRow = {
  id: string
  slug: string
  title: string
  description: string | null
  problem: string | null
  solution: string | null
  impact: string | null
  learnings: string | null
  repoUrl: string | null
  liveUrl: string | null
  published: boolean
}

type ContextProject = {
  slug: string
  title: string
  description: string
  techStack: string[]
  highlights: string[]
  repoUrl: string
  liveUrl: string
}

export type ProjectUpdate = {
  id: string
  slug: string
  data: Partial<Omit<ProjectRow, "id" | "slug" | "title">>
}

export type ProjectCreate = {
  slug: string
  title: string
  description: string
  impact: string
  techStack: string[]
  repoUrl: string
  liveUrl: string
  published: true
}

export type CorrectionPlan = {
  updates: ProjectUpdate[]
  creates: ProjectCreate[]
  warnings: string[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))

export function loadContextProjects(): ContextProject[] {
  const data = JSON.parse(
    readFileSync(join(__dirname, "../chat/portfolio-context.json"), "utf-8")
  ) as { projects: ContextProject[] }
  return data.projects
}

/** "https://github.com/darunbjork/voxcript.git/" → "darunbjork/voxcript" (lower-cased) */
export function repoKey(repoUrl: string | null | undefined): string | null {
  if (repoUrl === null || repoUrl === undefined) return null
  const m = /github\.com\/([^/\s]+)\/([^/\s#?]+)/i.exec(repoUrl.trim())
  if (m === null) return null
  return `${m[1]}/${m[2]!.replace(/\.git$/i, "")}`.toLowerCase()
}

const TEXT_FIELDS = ["description", "problem", "solution", "impact", "learnings"] as const

// Phrases that contradict the current READMEs; flagged for a human to rewrite.
const STALE_PHRASES: { repo: string; pattern: RegExp; label: string }[] = [
  { repo: "darunbjork/research-assistant-platform", pattern: /640\+?/, label: "old '640+ tests' count" },
  { repo: "darunbjork/research-assistant-platform", pattern: /not (yet )?shipped|in progress|not live/i, label: "'not shipped' wording" },
  { repo: "darunbjork/devquiz-api", pattern: /\blive\b/i, label: "'live' claim" },
]

function impactFrom(p: ContextProject): string {
  return p.highlights.join("\n")
}

export function planProjectCorrections(
  rows: ProjectRow[],
  contextProjects: ContextProject[] = loadContextProjects()
): CorrectionPlan {
  const byRepo = new Map(contextProjects.map((p) => [repoKey(p.repoUrl), p]))
  const research = byRepo.get("darunbjork/research-assistant-platform")
  const voxcript = byRepo.get("darunbjork/voxcript")
  if (research === undefined || voxcript === undefined) {
    throw new Error("portfolio-context.json must list research-assistant-platform and voxcript")
  }

  const updates: ProjectUpdate[] = []
  const warnings: string[] = []
  let voxcriptRow = false

  for (const row of rows) {
    const key = repoKey(row.repoUrl)
    const data: ProjectUpdate["data"] = {}

    // every field: links to the unowned darun.dev domain → PORTFOLIO_URL
    for (const field of [...TEXT_FIELDS, "liveUrl"] as const) {
      const value = row[field]
      if (value !== null && UNOWNED_PORTFOLIO_URL.test(value)) {
        data[field] = value.replace(UNOWNED_PORTFOLIO_URL, PORTFOLIO_URL)
      }
      UNOWNED_PORTFOLIO_URL.lastIndex = 0
    }

    if (key === "darunbjork/research-assistant-platform") {
      if (row.liveUrl !== research.liveUrl) data.liveUrl = research.liveUrl
      if (!row.published) data.published = true
      if (row.impact !== impactFrom(research)) data.impact = impactFrom(research)
    }

    if (key === "darunbjork/voxcript") {
      voxcriptRow = true
      if (row.liveUrl !== voxcript.liveUrl) data.liveUrl = voxcript.liveUrl
      if (!row.published) data.published = true
    }

    // devquiz-api is a backend: never claim it as live
    if (key === "darunbjork/devquiz-api" && row.liveUrl !== null) {
      data.liveUrl = null
    }

    for (const stale of STALE_PHRASES) {
      if (stale.repo !== key) continue
      for (const field of TEXT_FIELDS) {
        if (field === "impact" && data.impact !== undefined) continue // being replaced
        const value = data[field] ?? row[field]
        if (typeof value === "string" && stale.pattern.test(value)) {
          warnings.push(`${row.slug}.${field}: ${stale.label} — edit it in the admin CMS`)
        }
      }
    }

    if (Object.keys(data).length > 0) updates.push({ id: row.id, slug: row.slug, data })
  }

  const creates: ProjectCreate[] = []
  if (!voxcriptRow) {
    const slugTaken = rows.some((r) => r.slug === voxcript.slug)
    if (slugTaken) {
      warnings.push(`slug "${voxcript.slug}" exists without the voxcript repoUrl — not creating a duplicate`)
    } else {
      creates.push({
        slug: voxcript.slug,
        title: voxcript.title,
        description: voxcript.description,
        impact: impactFrom(voxcript),
        techStack: voxcript.techStack,
        repoUrl: voxcript.repoUrl,
        liveUrl: voxcript.liveUrl,
        published: true,
      })
    }
  }

  return { updates, creates, warnings }
}
