import { useEffect } from "react"
import { X, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGeneratePitch } from "@/hooks/useJobSearch"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { cn } from "@/lib/utils"
import type { ScoredJob } from "@/lib/jobs-api"

export function getScoreBadgeClass(score: number): string {
  if (score >= 70) return "bg-emerald-600/20 text-emerald-300"
  if (score >= 40) return "bg-amber-500/20 text-amber-300"
  return "bg-white/5 text-(--muted)"
}

export function JobDetailModal({
  job,
  onClose,
}: {
  job: ScoredJob
  onClose: () => void
}): React.JSX.Element {
  useBodyScrollLock(true)
  const pitchMutation = useGeneratePitch()
  const pitch = pitchMutation.data?.pitch

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleCopy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied")
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleGenerate = (): void => {
    const jdText = job.description
      ? `${job.title} at ${job.company}\n\n${job.description}`
      : `${job.title} at ${job.company}`
    pitchMutation.mutate(jdText)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
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
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-(--muted) hover:text-(--text)"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-8">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-(--text)">{job.title}</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                getScoreBadgeClass(job.matchScore),
              )}
            >
              {job.matchScore}%
            </span>
          </div>
          <p className="text-sm text-(--muted)">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          {job.applyUrl && (
            <div className="mt-3">
              <Button type="button" variant="secondary" size="sm" asChild>
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  Open application <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Pitch section */}
        <div className="space-y-4 border-t border-(--border) pt-4">
          {!pitch && (
            <div className="flex flex-col items-start gap-3">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={pitchMutation.isPending}
              >
                {pitchMutation.isPending ? "Analyzing…" : "Generate pitch"}
              </Button>
              {pitchMutation.isError && (
                <p className="text-sm text-red-400">
                  Pitch generation failed:{" "}
                  {pitchMutation.error instanceof Error
                    ? pitchMutation.error.message
                    : "Unknown error"}
                </p>
              )}
            </div>
          )}

          {pitch && (
            <div className="space-y-5">
              {/* Fit summary */}
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-(--muted)">
                  Fit summary
                </h3>
                <p className="text-sm leading-relaxed text-(--text)">
                  {pitch.fitSummary}
                </p>
              </div>

              {/* Matched skills */}
              {pitch.matchedSkills.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-(--muted)">
                    Matched skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {pitch.matchedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Growth areas */}
              {pitch.gapSkills.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-(--muted)">
                    Growth areas
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {pitch.gapSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-300"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pitch text */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
                    Pitch text
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(pitch.pitchText)}
                    className="h-7 gap-1 px-2 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
                <div className="rounded-lg border border-(--border) bg-(--surface) p-3 text-xs leading-relaxed text-(--text) whitespace-pre-wrap">
                  {pitch.pitchText}
                </div>
              </div>

              {/* Cover letter */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-(--muted)">
                    Cover letter
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(pitch.coverLetter)}
                    className="h-7 gap-1 px-2 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
                <div className="rounded-lg border border-(--border) bg-(--surface) p-3 text-xs leading-relaxed text-(--text) whitespace-pre-wrap">
                  {pitch.coverLetter}
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
