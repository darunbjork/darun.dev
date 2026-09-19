import type { FastifyInstance } from "fastify"
import type { JobListing } from "../jobs.types.js"
import type { JobWatcherDto } from "../job-watcher.service.js"
import { fetchGreenhouseJobs } from "./greenhouse.client.js"
import { fetchLeverJobs } from "./lever.client.js"
import { fetchAshbyJobs } from "./ashby.client.js"

async function fetchOne(
  watcher: JobWatcherDto,
  app: FastifyInstance,
): Promise<JobListing[]> {
  try {
    let jobs: JobListing[] = []
    if (watcher.ats === "greenhouse") {
      jobs = await fetchGreenhouseJobs(watcher.companySlug)
    } else if (watcher.ats === "lever") {
      jobs = await fetchLeverJobs(watcher.companySlug)
    } else if (watcher.ats === "ashby") {
      jobs = await fetchAshbyJobs(watcher.companySlug)
    } else {
      return []
    }

    return jobs
  } catch (err) {
    app.log.warn(
      { err, ats: watcher.ats, slug: watcher.companySlug },
      "ats fetch failed",
    )
    return []
  }
}

export async function fetchAllAtsJobs(
  app: FastifyInstance,
  watchers: JobWatcherDto[],
): Promise<JobListing[]> {
  if (watchers.length === 0) return []

  const perWatcher = await Promise.all(
    watchers.map((w) => fetchOne(w, app)),
  )

  const merged = perWatcher.flat()

  const seen = new Set<string>()
  const deduped: JobListing[] = []
  for (const job of merged) {
    const key = `${job.title.toLowerCase()}::${job.company.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(job)
  }

  return deduped
}