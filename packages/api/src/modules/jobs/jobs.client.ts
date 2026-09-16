import { env } from "../../env.js"
import { AppError } from "../../utils/errors.js"
import type { JobListing } from "./jobs.types.js"

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"

/**
 * European countries supported by Adzuna.
 * Sweden (`se`) is not supported and is excluded from the search pool.
 */
export const EUROPEAN_ADZUNA_COUNTRIES = [
  "gb",
  "de",
  "fr",
  "nl",
  "es",
  "it",
  "at",
  "be",
  "ch",
  "pl",
] as const

export type AdzunaCountry = (typeof EUROPEAN_ADZUNA_COUNTRIES)[number]

type AdzunaResult = {
  results?: Array<{
    id?: string | number
    title?: string
    company?: { display_name?: string }
    location?: { display_name?: string }
    description?: string
    salary_min?: number
    salary_max?: number
    redirect_url?: string
    created?: string
  }>
}

function requireAdzunaCreds(): { appId: string; appKey: string } {
  const appId = env.ADZUNA_APP_ID
  const appKey = env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    throw new AppError("Adzuna is not configured", 503, "JOBS_NOT_CONFIGURED")
  }
  return { appId, appKey }
}

function looksRemote(text: string): boolean {
  return /remote|work from home|\bwfh\b|hybrid/i.test(text)
}

function isValidCountry(code: string): code is AdzunaCountry {
  return (EUROPEAN_ADZUNA_COUNTRIES as readonly string[]).includes(code)
}

async function fetchOneCountry(opts: {
  country: AdzunaCountry
  what: string
  where?: string
  page: number
  resultsPerPage: number
}): Promise<JobListing[]> {
  const { appId, appKey } = requireAdzunaCreds()

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(opts.resultsPerPage),
    what: opts.what,
  })
  if (opts.where) params.set("where", opts.where)

  const url = `${ADZUNA_BASE}/${opts.country}/search/${opts.page}?${params.toString()}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "darun.dev-portfolio",
      },
    })
  } catch {
    return []
  }

  if (!res.ok) return []

  const data = (await res.json()) as AdzunaResult
  const rows = data.results ?? []

  return rows.map((r, index) => {
    const title = r.title ?? "Untitled"
    const company = r.company?.display_name ?? "Unknown"
    const location = r.location?.display_name ?? ""
    const description = r.description ?? ""
    const blob = `${title} ${location} ${description}`

    return {
      id: `adzuna:${opts.country}:${String(r.id ?? `${title}-${index}`)}`,
      source: "adzuna" as const,
      title,
      company,
      location: location || opts.country.toUpperCase(),
      description,
      salaryMin: typeof r.salary_min === "number" ? r.salary_min : null,
      salaryMax: typeof r.salary_max === "number" ? r.salary_max : null,
      currency: null,
      remote: looksRemote(blob),
      applyUrl: r.redirect_url ?? "",
      postedAt: r.created ?? null,
    }
  })
}

/**
 * Fan out across the requested European countries, merge, and deduplicate.
 * A failed country is isolated so successful country results remain available.
 */
export async function fetchAdzunaJobs(opts: {
  countries?: string[]
  what: string
  where?: string
  page?: number
  resultsPerPage?: number
}): Promise<JobListing[]> {
  const requested = (opts.countries ?? [...EUROPEAN_ADZUNA_COUNTRIES])
    .map((country) => country.toLowerCase().trim())
    .filter(isValidCountry)

  const countries: AdzunaCountry[] =
    requested.length > 0 ? requested : [...EUROPEAN_ADZUNA_COUNTRIES]

  const page = opts.page ?? 1
  const resultsPerPage = Math.min(50, opts.resultsPerPage ?? 15)

  const perCountry = await Promise.all(
    countries.map((country) =>
      fetchOneCountry({
        country,
        what: opts.what,
        where: opts.where,
        page,
        resultsPerPage,
      })
    )
  )

  const seen = new Set<string>()
  const deduped: JobListing[] = []
  for (const job of perCountry.flat()) {
    const key = `${job.title.toLowerCase()}::${job.company.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(job)
  }

  return deduped
}
