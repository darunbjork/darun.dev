import { Link } from "react-router-dom"
import type { Project } from "@darun/shared-types"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Seo } from "@/components/seo"
import { useAdminProjects } from "@/hooks/useAdminProjects"
import { cn } from "@/lib/utils"

export function AdminProjectsPage(): React.JSX.Element {
  const { projects, isLoading, isError, error, refetch } = useAdminProjects()

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-(--void) px-6 py-10 text-(--text)">
      <Seo
        title="Admin Projects"
        path="/admin/projects"
        noIndex
        description="Admin project inventory"
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-(--muted)">
            Admin inventory · create/edit via API for now
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
        </div>
      </div>

      {isError && (
        <GlassCard className="mb-4 p-4 text-sm text-red-400">
          {error?.message ?? "Failed to load (admin auth required)"}
        </GlassCard>
      )}

      {isLoading && (
        <p className="text-sm text-(--muted)">Loading projects…</p>
      )}

      <div className="space-y-3">
        {(projects ?? []).map((p: Project) => (
          <GlassCard key={p.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-(--text)">{p.title}</h2>
                <p className="font-mono text-xs text-(--muted)">{p.slug}</p>
                <p className="mt-2 max-w-2xl text-sm text-(--muted)">
                  {p.description ?? "—"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    p.published
                      ? "bg-(--iris)/20 text-(--iris-soft)"
                      : "bg-white/5 text-(--muted)"
                  )}
                >
                  {p.published ? "published" : "draft"}
                </span>
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
          </GlassCard>
        ))}
        {!isLoading && (projects ?? []).length === 0 && (
          <GlassCard className="p-6 text-sm text-(--muted)">
            No projects yet. Create via{" "}
            <code className="text-(--iris-soft)">
              POST /api/v1/admin/projects
            </code>
            .
          </GlassCard>
        )}
      </div>
    </div>
  )
}