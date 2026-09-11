import { memo } from "react"
import type { Project } from "@darun/shared-types"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"

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

  return (
    <GlassCard
      glow="iris"
      role="button"
      tabIndex={0}
      className="cursor-pointer transition-all hover:border-(--iris)/50"
      onClick={() => onSelect(project)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect(project)
        }
      }}
    >
      <div className="aspect-video overflow-hidden rounded-t-2xl bg-(--void)">
        {cover !== null && cover.length > 0 ? (
          <img
            src={cover}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
      </div>

      <div className="p-4">
        <h3 className="mb-1 font-semibold text-(--text)">{project.title}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-(--muted)">
          {project.description ?? "No description yet."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {stack.slice(0, 3).map((tech) => (
            <Badge key={tech} variant="secondary">
              {tech}
            </Badge>
          ))}
          <span className="ml-auto font-mono text-xs text-(--muted)">
            {project.views} views
          </span>
        </div>
      </div>
    </GlassCard>
  )
}

export const ProjectCard = memo(ProjectCardComponent)
ProjectCard.displayName = "ProjectCard"