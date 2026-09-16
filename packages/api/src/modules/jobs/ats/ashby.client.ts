import type { JobListing } from "../jobs.types.js"

type AshbyResponse = {
  jobs?: Array<{
    id?: string
    title?: string
    location?: string
    descriptionHtml?: string
    jobUrl?: string
    publishedAt?: string
    isRemote?: boolean
  }>
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

export async function fetchAshbyJobs(
  companySlug: string,
): Promise<JobListing[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(companySlug)}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "darun.dev-portfolio" },
    })
  } catch {
    return []
  }

  if (!res.ok) {
    return []
  }

  const data = (await res.json()) as AshbyResponse
  const rows = data.jobs ?? []

  return rows.map((j, index) => {
    const title = j.title ?? "Untitled"
    const location = j.location ?? ""
    const description = j.descriptionHtml ? stripHtml(j.descriptionHtml) : ""

    return {
      id: `ashby:${companySlug}:${String(j.id ?? index)}`,
      source: "ashby" as const,
      title,
      company: companySlug,
      location,
      description,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      remote: j.isRemote === true || /remote/i.test(location),
      applyUrl: j.jobUrl ?? "",
      postedAt: j.publishedAt ?? null,
    }
  })
}