import { useState } from "react"
import type { Project } from "@darun/shared-types"
import { useProjects } from "@/hooks/useProjects"
import { ProjectCard } from "@/components/project-card"
import { ProjectModal } from "@/components/project-modal"
import { GlassCard } from "@/components/glass-card"

export function ProjectGrid(): React.JSX.Element {
  const { projects, isLoading, isError, error } = useProjects()
  const [selected, setSelected] = useState<Project | null>(null)

  if (isLoading) {
    return <p className="text-(--muted)]">Loading projects…</p>
  }

  if (isError) {
    return <p className="text-red-400">{error?.message ?? "Failed to load projects"}</p>
  }

  const list = projects ?? []

  if (list.length === 0) {
    return <GlassCard className="p-6"><p className="text-sm text-(--muted)]">No published projects yet. Create one via the admin API.</p></GlassCard>
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((project) => (
          <ProjectCard key={project.id} project={project} onSelect={setSelected} />
        ))}
      </div>

      {selected !== null && <ProjectModal project={selected} onClose={() => setSelected(null)} />}
    </>
  )
}