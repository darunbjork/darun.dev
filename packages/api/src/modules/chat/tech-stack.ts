import { z } from "zod"

// ! Every technology the chatbot may claim must be proven by code in a named
// ! darunbjork repo. An empty provenBy fails validation and blocks boot.

const GITHUB_OWNER_URL = "https://github.com/darunbjork/"

const ProvenBySchema = z
  .object({
    repo: z.string().regex(/^[A-Za-z0-9._-]+$/),
    url: z.string().url(),
    evidence: z.string().min(3).max(90),
  })
  .refine((p) => p.url === `${GITHUB_OWNER_URL}${p.repo}`, {
    message: `url must be ${GITHUB_OWNER_URL}<repo>`,
    path: ["url"],
  })

const TechnologySchema = z.object({
  name: z.string().min(1),
  provenBy: z
    .array(ProvenBySchema)
    .min(1, "every technology needs at least one provenBy repo"),
})

const StackSchema = z.record(z.string(), z.array(TechnologySchema).min(1))

export type ProvenBy = z.infer<typeof ProvenBySchema>
export type Technology = z.infer<typeof TechnologySchema>
export type Stack = z.infer<typeof StackSchema>

export function parseStack(raw: unknown): Stack {
  const result = StackSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `stack.${i.path.join(".")}: ${i.message}`)
      .join("; ")
    throw new Error(`Invalid portfolio-context stack — ${issues}`)
  }
  return result.data
}

/**
 * Compact view for the model: each repo URL appears once in `repoLinks`, each
 * technology is one line "Name — repo: evidence | repo: evidence". Keeps the
 * system context small so RAG chunks are not trimmed out of the prompt.
 */
export function toModelContext(
  data: Record<string, unknown>
): Record<string, unknown> {
  const stack = parseStack(data.stack)
  const repoLinks: Record<string, string> = {}
  const compact: Record<string, string[]> = {}

  for (const [category, techs] of Object.entries(stack)) {
    compact[category] = techs.map((t) => {
      for (const p of t.provenBy) repoLinks[p.repo] = p.url
      const proof = t.provenBy.map((p) => `${p.repo}: ${p.evidence}`).join(" | ")
      return `${t.name} — ${proof}`
    })
  }

  return { ...data, stack: compact, repoLinks }
}
