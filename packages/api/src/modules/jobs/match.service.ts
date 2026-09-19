import type { FastifyInstance } from "fastify"
import type { JobListing } from "./jobs.types.js"

const VOCAB_KEY = "jobs:vocab:v1"
const VOCAB_TTL = 60 * 60

export type ScoredJobListing = JobListing & {
  matchScore: number
  matchedSkills: string[]
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\- ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t.length <= 30)
}

async function buildVocabulary(app: FastifyInstance): Promise<string[]> {
  const cached = await app.redis.get(VOCAB_KEY)
  if (cached !== null) {
    return JSON.parse(cached) as string[]
  }

  const set = new Set<string>()

  const cv = await app.prisma.cvDocument.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  })
  if (cv !== null) {
    for (const token of tokenize(cv.content)) set.add(token)
  }

  const projects = await app.prisma.project.findMany({
    where: { published: true },
    select: { techStack: true },
  })
  for (const p of projects) {
    const stack = Array.isArray(p.techStack) ? p.techStack : []
    for (const item of stack) {
      if (typeof item === "string") {
        for (const token of tokenize(item)) set.add(token)
      }
    }
  }

  const vocab = Array.from(set)
  await app.redis.setex(VOCAB_KEY, VOCAB_TTL, JSON.stringify(vocab))
  return vocab
}

export function createMatchService(app: FastifyInstance) {
  return {
    async scoreJobs(jobs: JobListing[]): Promise<ScoredJobListing[]> {
      if (jobs.length === 0) return []

      const vocab = await buildVocabulary(app)
      const vocabSet = new Set(vocab)

      return jobs
        .map((job) => {
          const titleTokens = tokenize(job.title)
          const descTokens = tokenize(job.description)
          const matched = new Set<string>()

          for (const t of titleTokens) {
            if (vocabSet.has(t)) matched.add(t)
          }
          for (const t of descTokens) {
            if (vocabSet.has(t)) matched.add(t)
          }

          // Weight: title matches count 2x
          const titleHits = titleTokens.filter((t) => vocabSet.has(t)).length
          const descHits = descTokens.filter((t) => vocabSet.has(t)).length
          const weighted = titleHits * 2 + descHits

          // Normalize against a soft cap so scores don't all sit at 100
          const cap = 40
          const raw = Math.min(100, Math.round((weighted / cap) * 100))

          return {
            ...job,
            matchScore: raw,
            matchedSkills: Array.from(matched).slice(0, 12),
          }
        })
        .sort((a, b) => b.matchScore - a.matchScore)
    },
  }
}

export type MatchService = ReturnType<typeof createMatchService>
