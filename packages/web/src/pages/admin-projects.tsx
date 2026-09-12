import { Link } from "react-router-dom"
import type { Project } from "@darun/shared-types"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Seo } from "@/components/seo"
import {
  useAdminProjects,
  useDeleteProject,
  useUpdateProject,
} from "@/hooks/useAdminProjects"
import { cn } from "@/lib/utils"
import { GithubImportPanel } from "@/components/github-import-panel"

export function AdminProjectsPage(): React.JSX.Element {
  const { projects, isLoading, isError, error, refetch } = useAdminProjects()
  const del = useDeleteProject()
  const update = useUpdateProject()

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-(--void) px-6 py-10 text-(--text)">
      <Seo title="Admin Projects" path="/admin/projects" noIndex />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-(--muted)">
            Create, edit, publish, and manage covers
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" asChild>
            <Link to="/admin/analytics">Analytics</Link>
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link to="/admin/chat">Chat</Link>
          </Button>
          <Button type="button" onClick={refetch}>
            Refresh
          </Button>
          <Button type="button" asChild>
            <Link to="/admin/projects/new">New project</Link>
          </Button>
        </div>
      </div>

      {/* ! GitHub import panel — collapses by default, "Browse repos" expands it */}
      <GithubImportPanel />

      {isError && (
        <GlassCard className="mb-4 p-4 text-sm text-red-400">
          {error?.message ?? "Failed to load"}
        </GlassCard>
      )}

      {isLoading && (
        <p className="text-sm text-(--muted)">Loading projects…</p>
      )}

      <div className="space-y-3">
        {(projects ?? []).map((p: Project) => (
          <GlassCard key={p.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                {p.coverUrl !== null && p.coverUrl.length > 0 && (
                  <img
                    src={p.coverUrl}
                    alt={p.title}
                    className="h-16 w-24 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h2 className="font-medium text-(--text)">{p.title}</h2>
                  <p className="font-mono text-xs text-(--muted)">{p.slug}</p>
                  <p className="mt-2 max-w-2xl text-sm text-(--muted)">
                    {p.description ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={(): void => {
                    void update.mutateAsync({
                      id: p.id,
                      input: {
                        title: p.title,
                        slug: p.slug,
                        published: !p.published,
                      },
                    })
                  }}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs transition-colors",
                    p.published
                      ? "bg-(--iris)/20 text-(--iris-soft) hover:bg-(--iris)/30"
                      : "bg-white/5 text-(--muted) hover:bg-white/10"
                  )}
                  disabled={update.isPending}
                >
                  {p.published ? "published" : "draft"}
                </button>
                <span className="font-mono text-xs text-(--muted)">
                  {p.views} views · ★ {Number(p.averageRating).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {(p.techStack ?? []).slice(0, 6).map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex gap-3 text-sm">
              <Link
                to={`/admin/projects/${p.id}`}
                className="text-(--iris-soft) hover:underline"
              >
                Edit
              </Link>
              <button
                type="button"
                className="text-red-400 hover:underline"
                onClick={(): void => {
                  if (window.confirm(`Delete "${p.title}"? This cannot be undone.`)) {
                    void del.mutateAsync(p.id)
                  }
                }}
                disabled={del.isPending}
              >
                Delete
              </button>
            </div>
          </GlassCard>
        ))}

        {!isLoading && (projects ?? []).length === 0 && (
          <GlassCard className="p-6 text-sm text-(--muted)">
            No projects yet. Click <strong>New project</strong> to create your first.
          </GlassCard>
        )}
      </div>
    </div>
  )
}