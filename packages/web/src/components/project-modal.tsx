import { useState, useEffect } from "react"
import { X } from "lucide-react"
import type { Project } from "@darun/shared-types"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { AnalyticsPanel } from "@/components/analytics-panel"
import { useProjectAnalytics } from "@/hooks/useAnalytics"
import { useProjectFeedback } from "@/hooks/useFeedback"
import { Button } from "@/components/ui/button"
import { FeedbackModal } from "@/components/feedback-modal"
import { formatRelativeUpdated } from "@/lib/github-match"

export function ProjectModal({
  project,
  onClose,
}: {
  project: Project
  onClose: () => void
}): React.JSX.Element {
  const { analytics } = useProjectAnalytics(project)
  const [showFeedback, setShowFeedback] = useState(false)
  const [tab, setTab] = useState<"analytics" | "reviews">("analytics")
  const { data: reviewsData, isLoading: reviewsLoading } = useProjectFeedback(
    project.slug,
    1
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      onClick={onClose}
    >
      <GlassCard
        elevated
        glow="iris"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-2 text-(--muted) hover:bg-white/5 hover:text-(--text)"
          aria-label="Close project details"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <h2
          id="project-modal-title"
          className="pr-10 text-2xl font-semibold text-(--text)"
        >
          {project.title}
        </h2>
        <p className="mt-2 text-sm text-(--muted)">
          {project.description ?? ""}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(project.techStack ?? []).map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>

        <div className="mt-6">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTab("analytics")}
              className={
                tab === "analytics"
                  ? "rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white"
                  : "rounded-lg border border-(--border) px-3 py-1.5 text-sm text-(--text)"
              }
            >
              Analytics
            </button>
            <button
              type="button"
              onClick={() => setTab("reviews")}
              className={
                tab === "reviews"
                  ? "rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white"
                  : "rounded-lg border border-(--border) px-3 py-1.5 text-sm text-(--text)"
              }
            >
              Reviews ({reviewsData?.total ?? 0})
            </button>
          </div>

          {tab === "analytics" ? (
            <AnalyticsPanel data={analytics} />
          ) : reviewsLoading ? (
            <p className="text-sm text-(--muted)">Loading reviews…</p>
          ) : (reviewsData?.items ?? []).length === 0 ? (
            <p className="text-sm text-(--muted)">No approved reviews yet.</p>
          ) : (
            <ul className="max-h-64 space-y-3 overflow-y-auto">
              {(reviewsData?.items ?? []).map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-(--border) p-3 text-sm"
                >
                  <div className="flex justify-between text-xs text-(--muted)">
                    <span className="text-amber-400/90">
                      {"★".repeat(item.rating)}
                    </span>
                    <span>{formatRelativeUpdated(item.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-(--text)">{item.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm text-(--muted)">
          {project.problem !== null && project.problem.length > 0 && (
            <p>
              <span className="text-(--text)">Problem: </span>
              {project.problem}
            </p>
          )}
          {project.solution !== null && project.solution.length > 0 && (
            <p>
              <span className="text-(--text)">Solution: </span>
              {project.solution}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {project.liveUrl !== null && project.liveUrl.length > 0 && (
            <Button type="button" asChild>
              <a href={project.liveUrl} target="_blank" rel="noreferrer">
                Live demo
              </a>
            </Button>
          )}
          {project.repoUrl !== null && project.repoUrl.length > 0 && (
            <Button type="button" variant="secondary" asChild>
              <a href={project.repoUrl} target="_blank" rel="noreferrer">
                Repository
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowFeedback(true)}
          >
            Leave feedback
          </Button>
        </div>
      </GlassCard>

      {showFeedback && (
        <FeedbackModal
          slug={project.slug}
          title={project.title}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  )
}