import { env } from "../../../env.js"
import { AppError } from "../../../utils/errors.js"
import type { JobListing } from "../jobs.types.js"

type LeverPosting = {
  id?: string
  text?: string
  categories?: {
    location?: string
    team?: string
    commitment?: string
  }
  descriptionPlain?: string
  hostedUrl?: string
  createdAt?: number
}

export async function fetchLeverJobs(
  companySlug: string,
): Promise<JobListing[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(companySlug)}?mode=json`

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "darun.dev-portfolio" },
    })
  } catch (err) {
    console.error("[lever] fetch threw", companySlug, err)
    return []
  }

  if (!res.ok) {
    console.error("[lever] non-ok", companySlug, res.status, res.statusText)
    return []
  }

  const rows = (await res.json()) as LeverPosting[]
  console.error("[lever] got", companySlug, rows.length)

  return rows.map((j, index) => {
    const title = j.text ?? "Untitled"
    const location = j.categories?.location ?? ""
    const description = j.descriptionPlain ?? ""
    const postedAt = typeof j.createdAt === "number"
      ? new Date(j.createdAt).toISOString()
      : null

    return {
      id: `lever:${companySlug}:${String(j.id ?? index)}`,
      source: "lever" as const,
      title,
      company: companySlug,
      location,
      description,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      remote: /remote/i.test(location) || /remote/i.test(description),
      applyUrl: j.hostedUrl ?? "",
      postedAt,
    }
  })
}