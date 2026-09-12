import { useState } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { useAdminGithubRepos, useImportGithubRepo } from "@/hooks/useGithub"

export function GithubImportPanel(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const repos = useAdminGithubRepos()
  const importer = useImportGithubRepo()

  return (
    <GlassCard className="mb-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-(--text)">Import from GitHub</h2>
          <p className="text-xs text-(--muted)">
            Create a draft project from one of your repos
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Browse repos"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 max-h-72 overflow-y-auto">
          {repos.isLoading && (
            <p className="text-xs text-(--muted)">Loading repos…</p>
          )}
          {repos.isError && (
            <p className="text-xs text-red-400">
              {repos.error instanceof Error ? repos.error.message : "Failed to load"}
            </p>
          )}
          <ul className="divide-y divide-white/5">
            {(repos.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-(--text)">
                    {r.fullName}
                  </div>
                  <div className="truncate font-mono text-xs text-(--muted)">
                    ★ {r.stars}
                    {r.language !== null ? ` · ${r.language}` : ""}
                    {r.description !== null ? ` · ${r.description}` : ""}
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={importer.isPending}
                  onClick={(): void => importer.mutate(r.fullName)}
                >
                  Import
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {importer.isError && (
        <p className="mt-2 text-xs text-red-400">
          {importer.error instanceof Error ? importer.error.message : "Import failed"}
        </p>
      )}
      {importer.isSuccess && (
        <p className="mt-2 text-xs text-emerald-400">
          Draft created — scroll down to edit and publish.
        </p>
      )}
    </GlassCard>
  )
}