import type { FastifyInstance } from "fastify"
import type { JobListing } from "./jobs.types.js"

const VOCAB_KEY = "jobs:vocab:v2"
const VOCAB_TTL = 60 * 60

const STOPWORDS = new Set<string>([
  "a","about","above","after","again","against","all","also","am","an",
  "and","any","are","as","at","be","because","been","before","being",
  "below","between","both","but","by","can","cannot","could","did","do",
  "does","doing","down","during","each","either","else","ever","every",
  "few","for","from","further","get","got","had","has","have","having",
  "he","her","here","hers","herself","him","himself","his","how","however",
  "i","if","in","into","is","it","its","itself","just","keep","know",
  "let","like","look","made","make","many","may","me","might","more",
  "most","much","must","my","myself","need","new","no","nor","not","now",
  "of","off","on","once","only","or","other","our","ours","ourselves",
  "out","over","own","point","points","put","same","see","she","should",
  "since","so","some","such","take","than","that","the","their","theirs",
  "them","themselves","then","there","these","they","this","those",
  "through","to","too","under","until","up","us","use","using","very",
  "want","was","we","well","were","what","when","where","which","while",
  "who","whom","why","will","with","within","without","would","you",
  "your","yours","yourself","yourselves","work","working","works","role",
  "roles","team","teams","company","companies","help","helps","build",
  "building","builds","built","about","across","around","including",
  "includes","include","strong","good","great","excellent","experience",
  "experienced","years","year","plus","plus,","etc","various","multiple",
  "ability","skills","skill","knowledge","understanding","familiar",
  "comfortable","expertise","proficient","proficiency","bonus","preferred",
  "required","requirements","responsibilities","qualifications","ideal",
  "candidate","candidates","position","positions","job","jobs","apply",
  "opportunity","opportunities","applicants","we're","you'll","we'll",
  "you're","it's","don't","doesn't","didn't","isn't","aren't","wasn't",
  "weren't","hasn't","haven't","hadn't","won't","wouldn't","shouldn't",
  "couldn't","i'm","i've","i'll","i'd","there's","that's","what's",
  "who's","here's","let's","what'll","what're","what's","server","service",
  "services","system","systems","data","code","coding","develop","developing",
  "developed","development","developer","developers","engineer","engineers",
  "engineering","software","technology","technologies","technical","tech",
  "senior","junior","staff","principal","lead","leader","manager","director",
  "analyst","specialist","consultant","architect","administrator","professional",
  "expert","associate","intern","entry","mid","levels","level","high","low",
  "our","being","well","forward","looking","join","joining","helping","help",
  "focused","hands","team","culture","values","mission","vision","impact",
])

export type ScoredJobListing = JobListing & {
  matchScore: number
  matchedSkills: string[]
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#. -]+/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((t) => t.length >= 2 && t.length <= 30)
    .filter((t) => !STOPWORDS.has(t))
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

          const titleMatched = new Set<string>()
          for (const t of titleTokens) {
            if (vocabSet.has(t)) titleMatched.add(t)
          }

          const descMatched = new Set<string>()
          for (const t of descTokens) {
            if (vocabSet.has(t)) descMatched.add(t)
          }

          // Union of title + desc matches, minus anything already in title.
          const allMatched = new Set<string>(titleMatched)
          for (const t of descMatched) allMatched.add(t)

          const titleHits = titleMatched.size
          const descHits = descMatched.size
          const weighted = titleHits * 3 + descHits

          // 12 weighted unique hits = 100. Forces the top scorer to be a
          // genuinely skill-dense job, not just any posting that mentions
          // "react" ten times.
          const cap = 12
          const raw = Math.min(100, Math.round((weighted / cap) * 100))

          return {
            ...job,
            matchScore: raw,
            matchedSkills: Array.from(allMatched).slice(0, 10),
          }
        })
        .sort((a, b) => b.matchScore - a.matchScore)
    },
  }
}

export type MatchService = ReturnType<typeof createMatchService>
