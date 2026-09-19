import { api, type ApiEnvelope } from "@/lib/api"

export type JobSource = "adzuna" | "greenhouse" | "lever" | "ashby"

export type ScoredJob = {
  id: string
  source: JobSource
  title: string
  company: string
  location: string
  description: string
  salaryMin: number | null
  salaryMax: number | null
  currency: string | null
  remote: boolean
  applyUrl: string
  postedAt: string | null
  matchScore: number
  matchedSkills: string[]
}

export type JobSearchResponse = {
  jobs: ScoredJob[]
  meta: {
    countries: string[]
    sources: JobSource[]
  }
}

export type JobSearchParams = {
  what: string
  where?: string
  countries?: string[]
  sources?: JobSource[]
}

export async function searchJobs(
  params: JobSearchParams,
): Promise<JobSearchResponse> {
  const qs = new URLSearchParams()
  if (params.what) qs.set("what", params.what)
  if (params.where) qs.set("where", params.where)
  if (params.countries && params.countries.length > 0) {
    qs.set("countries", params.countries.join(","))
  }
  if (params.sources && params.sources.length > 0) {
    qs.set("sources", params.sources.join(","))
  }
  const res = await api.get<{
    success: boolean
    data: ScoredJob[]
    meta?: {
      countries?: string[]
      sources?: JobSource[]
    }
    error?: string | null
  }>(`/api/v1/admin/jobs/search?${qs.toString()}`)

  if (!res.data.success) {
    throw new Error(res.data.error ?? "Search failed")
  }

  return {
    jobs: res.data.data,
    meta: {
      countries: res.data.meta?.countries ?? params.countries ?? [],
      sources: res.data.meta?.sources ?? params.sources ?? [],
    },
  }
}

export type PitchResult = {
  parsed: {
    role: string
    company?: string
    requiredSkills: string[]
    niceToHave: string[]
    responsibilities: string[]
  }
  pitch: {
    fitSummary: string
    matchedSkills: string[]
    gapSkills: string[]
    pitchText: string
    coverLetter: string
  }
}

export async function generatePitch(jdText: string): Promise<PitchResult> {
  const res = await api.post<ApiEnvelope<PitchResult>>(
    "/api/v1/admin/pitch/generate",
    { jdText },
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Pitch generation failed")
  }
  return res.data.data
}
