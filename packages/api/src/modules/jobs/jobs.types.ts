export type JobSource = "adzuna" | "greenhouse" | "lever" | "ashby"

export type JobListing = {
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
}
