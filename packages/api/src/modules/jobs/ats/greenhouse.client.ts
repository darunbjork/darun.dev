import type { JobListing } from "../jobs.types.js"

type GreenhouseResponse = {
  jobs?: Array<{
    id?: number
    title?: string
    location?: { name?: string }
    content?: string
    absolute_url?: string
    updated_at?: string
  }>
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

export async function fetchGreenhouseJobs(
  companySlug: string,
): Promise<JobListing[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(companySlug)}/jobs?content=true`

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

  const data = (await res.json()) as GreenhouseResponse
  const rows = data.jobs ?? []

  return rows.map((j, index) => {
    const title = j.title ?? "Untitled"
    const location = j.location?.name ?? ""
    const description = j.content ? stripHtml(j.content) : ""
    return {
      id: `greenhouse:${companySlug}:${String(j.id ?? index)}`,
      source: "greenhouse" as const,
      title,
      company: companySlug,
      location,
      description,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      remote: /remote/i.test(location) || /remote/i.test(description),
      applyUrl: j.absolute_url ?? "",
      postedAt: j.updated_at ?? null,
    }
  })
}