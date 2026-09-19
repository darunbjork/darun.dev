import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Seo } from "@/components/seo"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  useJobWatchers,
  useCreateJobWatcher,
  useSetJobWatcherEnabled,
  useDeleteJobWatcher,
} from "@/hooks/useJobWatchers"
import type { AtsSource, JobWatcher } from "@/lib/job-watchers-api"

const ATS_NAMES = ["greenhouse", "lever", "ashby"] as const
const ATS_OPTIONS: AtsSource[] = ["greenhouse", "lever", "ashby"]

export function AdminJobWatchersPage(): React.JSX.Element {
  const { data: watchers, isLoading, isError, error } = useJobWatchers()
  const create = useCreateJobWatcher()
  const toggle = useSetJobWatcherEnabled()
  const del = useDeleteJobWatcher()

  const [ats, setAts] = useState<AtsSource>("greenhouse")
  const [companySlug, setCompanySlug] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("")
  const [pendingDelete, setPendingDelete] = useState<JobWatcher | null>(null)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (companySlug.trim().length === 0) return
    const clean = companySlug.trim().toLowerCase()
    if ((ATS_NAMES as readonly string[]).includes(clean)) {
      toast.error(`"${clean}" is an ATS name, not a company slug. Switch the ATS dropdown if you meant a different source.`)
      return
    }
    create.mutate(
      {
        ats,
        companySlug: clean,
        displayName: displayName.trim() || undefined,
      },
      {
        onSuccess: (w) => {
          toast.success(`Added ${w.ats}/${w.companySlug}`)
          setCompanySlug("")
          setDisplayName("")
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to add watcher")
        },
      },
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-(--void) px-6 py-10 text-(--text)">
      <Seo title="Job Watchers" path="/admin/job-watchers" noIndex />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Job watchers</h1>
          <p className="text-sm text-(--muted)">
            ATS boards to pull jobs from during search.
          </p>
        </div>
        <Button type="button" variant="secondary" asChild>
          <Link to="/admin/projects">← Back to projects</Link>
        </Button>
      </div>

      <GlassCard className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold">Add a watcher</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-(--muted)">ATS</label>
            <select
              value={ats}
              onChange={(e) => setAts(e.target.value as AtsSource)}
              className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text)"
            >
              {ATS_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-(--muted)">Company slug</label>
            <input
              type="text"
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              placeholder="snyk"
              className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text)"
            />
            <span className="text-[10px] text-(--muted)">Company on the ATS, not the ATS name.</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-(--muted)">Display name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Snyk"
              className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text)"
            />
          </div>
          <Button type="submit" disabled={create.isPending || companySlug.trim().length === 0}>
            {create.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      </GlassCard>

      {isLoading && <p className="text-sm text-(--muted)">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      )}

      {!isLoading && !isError && (watchers ?? []).length === 0 && (
        <GlassCard className="p-6 text-sm text-(--muted)">
          No watchers yet. Add one above.
        </GlassCard>
      )}

      <div className="space-y-2">
        {(watchers ?? []).map((w) => (
          <GlassCard key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{w.ats}</Badge>
              <span className="font-mono text-sm text-(--text)">
                {w.companySlug}
              </span>
              {w.displayName && (
                <span className="text-xs text-(--muted)">{w.displayName}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  toggle.mutate(
                    { id: w.id, enabled: !w.enabled },
                    {
                      onSuccess: (updated) => {
                        toast.success(
                          updated.enabled
                            ? `Enabled ${updated.ats}/${updated.companySlug}`
                            : `Disabled ${updated.ats}/${updated.companySlug}`,
                        )
                      },
                      onError: (err) => {
                        toast.error(err instanceof Error ? err.message : "Failed to update")
                      },
                    },
                  )
                }
                disabled={toggle.isPending}
                className={
                  w.enabled
                    ? "rounded-full bg-emerald-600/20 px-3 py-1 text-xs text-emerald-300"
                    : "rounded-full bg-white/5 px-3 py-1 text-xs text-(--muted)"
                }
              >
                {w.enabled ? "enabled" : "disabled"}
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(w)}
                disabled={del.isPending}
                className="text-xs text-red-400 hover:underline"
              >
                Delete
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete watcher"
        description={
          pendingDelete !== null
            ? `Remove ${pendingDelete.ats}/${pendingDelete.companySlug}? Jobs from this board will stop appearing in search results.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        isPending={del.isPending}
        onConfirm={() => {
          if (pendingDelete === null) return
          const target = pendingDelete
          del.mutate(target.id, {
            onSuccess: () => {
              toast.success(`Deleted ${target.ats}/${target.companySlug}`)
              setPendingDelete(null)
            },
            onError: (err) => {
              toast.error(err instanceof Error ? err.message : "Delete failed")
            },
          })
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}