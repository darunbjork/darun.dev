import { useState } from "react"
import { Link } from "react-router-dom"
import { Seo } from "@/components/seo"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { JobDetailModal } from "@/components/job-detail-modal"
import { useJobSearch } from "@/hooks/useJobSearch"
import { getScoreBadgeClass } from "@/lib/job-score"
import type { JobSource, ScoredJob } from "@/lib/jobs-api"
import { cn } from "@/lib/utils"

const COUNTRIES: { code: string; label: string }[] = [
  { code: "gb", label: "UK" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "nl", label: "Netherlands" },
  { code: "es", label: "Spain" },
  { code: "it", label: "Italy" },
  { code: "at", label: "Austria" },
  { code: "be", label: "Belgium" },
  { code: "ch", label: "Switzerland" },
  { code: "pl", label: "Poland" },
]

const SOURCES: JobSource[] = ["adzuna", "greenhouse", "lever", "ashby"]

function formatSalary(job: ScoredJob): string | null {
  if (job.salaryMin === null && job.salaryMax === null) return null
  const curr = job.currency ?? ""
  if (job.salaryMin !== null && job.salaryMax !== null) {
    return `${curr} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`.trim()
  }
  if (job.salaryMin !== null) {
    return `From ${curr} ${job.salaryMin.toLocaleString()}`.trim()
  }
  return `Up to ${curr} ${job.salaryMax?.toLocaleString()}`.trim()
}

export function AdminJobsPage(): React.JSX.Element {
  const [what, setWhat] = useState<string>("typescript")
  const [where, setWhere] = useState<string>("")
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    COUNTRIES.map((c) => c.code),
  )
  const [selectedSources, setSelectedSources] = useState<JobSource[]>([
    ...SOURCES,
  ])
  const [selectedJob, setSelectedJob] = useState<ScoredJob | null>(null)

  const search = useJobSearch()

  const toggleCountry = (code: string): void => {
    setSelectedCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  const toggleSource = (source: JobSource): void => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source],
    )
  }

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    search.mutate({
      what: what.trim(),
      where: where.trim() || undefined,
      countries: selectedCountries,
      sources: selectedSources,
    })
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-(--void) px-6 py-10 text-(--text)">
      <Seo title="Jobs" path="/admin/jobs" noIndex />

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-(--muted)">
            Aggregate job search with CV match scoring and pitch generation.
          </p>
        </div>
        <Button type="button" variant="secondary" asChild>
          <Link to="/admin/projects">← Back to projects</Link>
        </Button>
      </div>

      {/* Search Form */}
      <GlassCard className="mb-8 p-5">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--muted)">
                Keywords
              </label>
              <input
                type="text"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder="e.g. typescript, react, fullstack"
                className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text) focus:border-(--iris) focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--muted)">
                Location
              </label>
              <input
                type="text"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="e.g. London, Berlin, Remote"
                className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text) focus:border-(--iris) focus:outline-none"
              />
            </div>
          </div>

          {/* Countries */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-(--muted)">
              Countries (Adzuna)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COUNTRIES.map((c) => {
                const active = selectedCountries.includes(c.code)
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggleCountry(c.code)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-(--iris) text-white"
                        : "border border-(--border) bg-(--surface) text-(--muted) hover:bg-white/5",
                    )}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sources */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-(--muted)">
              Sources
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => {
                const active = selectedSources.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSource(s)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      active
                        ? "bg-(--iris) text-white"
                        : "border border-(--border) bg-(--surface) text-(--muted) hover:bg-white/5",
                    )}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              disabled={search.isPending || what.trim().length === 0}
            >
              {search.isPending ? "Searching…" : "Search"}
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Results */}
      {search.isPending && (
        <p className="text-sm text-(--muted)">Searching…</p>
      )}

      {search.isError && (
        <p className="text-sm text-red-400">
          {search.error instanceof Error ? search.error.message : "Search failed"}
        </p>
      )}

      {!search.isPending && !search.isError && search.data === undefined && (
        <GlassCard className="p-6 text-sm text-(--muted)">
          Search to see matched jobs.
        </GlassCard>
      )}

      {!search.isPending &&
        !search.isError &&
        search.data !== undefined &&
        search.data.jobs.length === 0 && (
          <GlassCard className="p-6 text-sm text-(--muted)">
            No jobs found matching criteria.
          </GlassCard>
        )}

      {!search.isPending &&
        !search.isError &&
        search.data !== undefined &&
        search.data.jobs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-(--muted)">
              <span>Found {search.data.jobs.length} jobs</span>
            </div>

            {search.data.jobs.map((job) => {
              const salary = formatSalary(job)
              return (
                <GlassCard
                  key={job.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:border-(--iris)/40"
                >
                  {/* Row 1: Title + score pill */}
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-medium text-(--text)">
                      {job.title}
                    </h2>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        getScoreBadgeClass(job.matchScore),
                      )}
                    >
                      {job.matchScore}%
                    </span>
                  </div>

                  {/* Row 2: Company · Location */}
                  <p className="text-sm text-(--muted)">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ""}
                  </p>

                  {/* Row 3: Source, remote, salary */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary" className="capitalize">
                      {job.source}
                    </Badge>
                    {job.remote && (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-600/20 text-emerald-300"
                      >
                        Remote
                      </Badge>
                    )}
                    {salary && (
                      <span className="text-(--muted)">{salary}</span>
                    )}
                  </div>

                  {/* Row 4: Matched skills (max 6) */}
                  {job.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.matchedSkills.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Row 5: Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {job.applyUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        asChild
                      >
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open application
                        </a>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSelectedJob(job)}
                    >
                      Pitch →
                    </Button>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}

      {/* Modal */}
      {selectedJob !== null && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  )
}
