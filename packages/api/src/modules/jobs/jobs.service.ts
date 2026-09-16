import type { FastifyInstance } from "fastify"
import { CacheKey, TTL, getOrSet } from "../../utils/cache.js"
import {
  EUROPEAN_ADZUNA_COUNTRIES,
  fetchAdzunaJobs,
} from "./jobs.client.js"
import type { JobListing } from "./jobs.types.js"

export function createJobsService(app: FastifyInstance) {
  return {
    async searchAdzuna(opts: {
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
        .map((country) => country.toLowerCase().trim())
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
        })
      )
    },
  }
}

export type JobsService = ReturnType<typeof createJobsService>
