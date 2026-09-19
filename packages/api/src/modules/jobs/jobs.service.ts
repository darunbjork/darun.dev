import type { FastifyInstance } from "fastify"
import { CacheKey, TTL, getOrSet } from "../../utils/cache.js"
import { fetchAdzunaJobs, EUROPEAN_ADZUNA_COUNTRIES } from "./jobs.client.js"
import { fetchAllAtsJobs } from "./ats/ats.aggregator.js"
import { JobWatcherService } from "./job-watcher.service.js"
import type { JobListing, JobSource } from "./jobs.types.js"
import { createMatchService, type ScoredJobListing } from "./match.service.js"

export function createJobsService(app: FastifyInstance) {
  const watchers = new JobWatcherService(app)
  const matcher = createMatchService(app)

  async function searchAdzuna(opts: {
    countries?: string[]
    what: string
    where?: string
    page?: number
  }): Promise<JobListing[]> {
    const countries = (
      opts.countries && opts.countries.length > 0
        ? opts.countries
        : [...EUROPEAN_ADZUNA_COUNTRIES]
    )
      .map((c) => c.toLowerCase().trim())
      .sort()

    const what = opts.what.trim() || "typescript developer"
    const where = opts.where?.trim() || ""
    const page = opts.page ?? 1

    const cacheKey = CacheKey.adzunaSearch({
      countries: countries.join(","),
      what,
      where,
      page,
    })

    return getOrSet(app.redis, cacheKey, TTL.JOBS_SEARCH, () =>
      fetchAdzunaJobs({
        countries,
        what,
        where: where || undefined,
        page,
      }),
    )
  }

  async function searchAts(
    what: string,
    atsFilter: Array<"greenhouse" | "lever" | "ashby">,
  ): Promise<JobListing[]> {
    const enabled = await watchers.listEnabled()
    const relevant = enabled.filter((w) => atsFilter.includes(w.ats))
    if (relevant.length === 0) return []

    const all = await fetchAllAtsJobs(app, relevant)
    if (!what) return all

    // Simple case-insensitive filter on title + description for ATS results.
    // Adzuna does its own server-side filtering; ATS does not.
    const needle = what.toLowerCase()
    return all.filter(
      (j) =>
        j.title.toLowerCase().includes(needle) ||
        j.description.toLowerCase().includes(needle),
    )
  }

  return {
    searchAdzuna,
    searchAts,

    async search(opts: {
      countries?: string[]
      what: string
      where?: string
      page?: number
      sources?: JobSource[]
    }): Promise<ScoredJobListing[]> {
      const sources = opts.sources ?? ["adzuna", "greenhouse", "lever", "ashby"]
      const tasks: Promise<JobListing[]>[] = []

      if (sources.includes("adzuna")) {
        tasks.push(
          searchAdzuna({
            countries: opts.countries,
            what: opts.what,
            where: opts.where,
            page: opts.page,
          }),
        )
      }

      const atsSources = sources.filter(
        (s): s is "greenhouse" | "lever" | "ashby" =>
          s === "greenhouse" || s === "lever" || s === "ashby",
      )
      if (atsSources.length > 0) {
        tasks.push(searchAts(opts.what, atsSources))
      }

      const results = await Promise.all(tasks)
      const merged = results.flat()
      return matcher.scoreJobs(merged)
    },
  }
}

export type JobsService = ReturnType<typeof createJobsService>