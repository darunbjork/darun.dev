import { z } from "zod"

// ! Every technology the chatbot may claim must be proven by a named darunbjork
// ! repo: "code" evidence (verified in the repo's source) or "live" evidence
// ! (a reachable deployment URL). Invalid data throws and blocks boot.

const GITHUB_OWNER_URL = "https://github.com/darunbjork/"
const MODEL_MAX_REPOS = 2

const RepoSchema = z
  .object({
    url: z.string().url(),
    status: z.enum(["shipped", "in progress"]),
  })
  .strict()

const ReposSchema = z.record(z.string().regex(/^[A-Za-z0-9._-]+$/), RepoSchema)

const ProvenBySchema = z
  .object({
    repo: z.string().regex(/^[A-Za-z0-9._-]+$/),
    url: z.string().url(),
    evidence: z.string().min(3).max(90),
    type: z.enum(["code", "live"]).default("code"),
    liveUrl: z.string().url().optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.url !== `${GITHUB_OWNER_URL}${p.repo}`) {
      ctx.addIssue({ code: "custom", path: ["url"], message: `url must be ${GITHUB_OWNER_URL}<repo>` })
    }
    if (p.type === "live" && !p.liveUrl?.startsWith("https://")) {
      ctx.addIssue({ code: "custom", path: ["liveUrl"], message: "live evidence needs an https liveUrl" })
    }
    if (p.type === "code" && p.liveUrl !== undefined) {
      ctx.addIssue({ code: "custom", path: ["liveUrl"], message: "liveUrl is only allowed on live evidence" })
    }
  })

const TechnologySchema = z
  .object({
    name: z.string().min(1),
    provenBy: z
      .array(ProvenBySchema)
      .min(1, "every technology needs at least one provenBy repo"),
  })
  .strict()

const StackSchema = z.record(z.string(), z.array(TechnologySchema).min(1))

const TechSchema = z
  .object({ repos: ReposSchema, stack: StackSchema })
  .superRefine(({ repos, stack }, ctx) => {
    for (const [name, repo] of Object.entries(repos)) {
      if (repo.url !== `${GITHUB_OWNER_URL}${name}`) {
        ctx.addIssue({ code: "custom", path: ["repos", name, "url"], message: `url must be ${GITHUB_OWNER_URL}${name}` })
      }
    }
    for (const [category, techs] of Object.entries(stack)) {
      techs.forEach((t, i) =>
        t.provenBy.forEach((p, j) => {
          if (!(p.repo in repos)) {
            ctx.addIssue({
              code: "custom",
              path: ["stack", category, i, "provenBy", j, "repo"],
              message: `"${p.repo}" is not in repos`,
            })
          }
        })
      )
    }
  })

export type Repos = z.infer<typeof ReposSchema>
export type ProvenBy = z.infer<typeof ProvenBySchema>
export type Technology = z.infer<typeof TechnologySchema>
export type Stack = z.infer<typeof StackSchema>

export function parseTech(raw: Record<string, unknown>): { repos: Repos; stack: Stack } {
  const result = TechSchema.safeParse({ repos: raw.repos, stack: raw.stack })
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ")
    throw new Error(`Invalid portfolio-context tech — ${issues}`)
  }
  return result.data
}

function repoLabel(repos: Repos, repo: string): string {
  return repos[repo]?.status === "in progress" ? `${repo} (in progress)` : repo
}

function describeProof(proofs: ProvenBy[]): string {
  return proofs
    .map((p) => (p.type === "live" ? `${p.evidence}, live at ${p.liveUrl}` : p.evidence))
    .join("; ")
}

/**
 * Compact view for the model. Each technology is one line
 * "Name — repo: evidence | repo: evidence" with at most MODEL_MAX_REPOS repos
 * (the full provenBy list stays in the JSON); repo URLs appear once in
 * `repoLinks`, labelled "(in progress)" where that applies.
 */
export function toModelContext(data: Record<string, unknown>): Record<string, unknown> {
  const { repos, stack } = parseTech(data)
  const compact: Record<string, string[]> = {}

  for (const [category, techs] of Object.entries(stack)) {
    compact[category] = techs.map((t) => {
      const byRepo = new Map<string, ProvenBy[]>()
      for (const p of t.provenBy) {
        if (!byRepo.has(p.repo) && byRepo.size >= MODEL_MAX_REPOS) continue
        byRepo.set(p.repo, [...(byRepo.get(p.repo) ?? []), p])
      }
      const proof = [...byRepo]
        .map(([repo, proofs]) => `${repoLabel(repos, repo)}: ${describeProof(proofs)}`)
        .join(" | ")
      return `${t.name} — ${proof}`
    })
  }

  const repoLinks = Object.fromEntries(
    Object.entries(repos).map(([name, r]) => [
      name,
      r.status === "in progress" ? `${r.url} (in progress)` : r.url,
    ])
  )

  const { repos: _registry, ...rest } = data
  return { ...rest, stack: compact, repoLinks }
}
