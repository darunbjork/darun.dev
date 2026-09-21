import { memo } from "react"
import { ArrowRight, ExternalLink } from "lucide-react"
import type { Project } from "@darun/shared-types"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { GithubBadges } from "@/components/github-badges"

function ProjectCardComponent({
  project,
  onSelect,
}: {
  project: Project
  onSelect: (project: Project) => void
}): React.JSX.Element {
  const stack = project.techStack ?? []

  // ! Fallback: if coverUrl is empty, use the first uploaded image
  const cover =
    project.coverUrl !== null && project.coverUrl.length > 0
      ? project.coverUrl
      : (project.images?.[0]?.url ?? null)

  const hasRepo = project.repoUrl !== null && project.repoUrl.length > 0

  return (
    <GlassCard
      glow="iris"
      role="button"
      tabIndex={0}
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-(--iris)/60 hover:shadow-[0_8px_30px_-12px_rgba(124,58,237,0.5)]"
      onClick={() => onSelect(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(project)
        }
      }}
    >
      <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-(--void)">
        {cover !== null && cover.length > 0 ? (
          <img
            src={cover}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-xs text-(--muted)">
            no cover
          </div>
        )}

        {/* Hover hint — appears only when the card is hovered */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-(--void)/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="mb-3 rounded-full bg-(--iris) px-3 py-1 font-mono text-xs text-white">
            Click to explore
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-(--text)">
            {project.title}
          </h3>
          {hasRepo && (
            <a
              href={project.repoUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${project.title} on GitHub`}
              className="shrink-0 rounded-lg p-1 text-(--muted) transition-colors hover:bg-white/5 hover:text-(--text)"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-(--muted)">
          {project.description ?? "No description yet."}
        </p>

        {/* ! GitHub live badges — renders only when project.repoUrl matches a repo */}
        <div className="mb-2">
          <GithubBadges project={project} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stack.slice(0, 3).map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-(--border) pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-(--iris-soft) transition-transform group-hover:translate-x-1">
            View details
            <ArrowRight size={12} aria-hidden />
          </span>
          <span className="font-mono text-xs text-slate-400">
            {project.views} views
          </span>
        </div>
      </div>
    </GlassCard>
  )
}

export const ProjectCard = memo(ProjectCardComponent)
ProjectCard.displayName = "ProjectCard"