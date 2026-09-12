import { Star, Clock } from "lucide-react"
import type { Project } from "@darun/shared-types"
import { useGithubRepos } from "@/hooks/useGithub"
import { matchGithubRepo, formatRelativeUpdated } from "@/lib/github-match"

export function GithubBadges({ project }: { project: Project }): React.JSX.Element | null {
  const { data: repos } = useGithubRepos()
  const gh = matchGithubRepo(project.repoUrl, repos)
  if (gh === null) return null

  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-(--muted)">
      <span className="inline-flex items-center gap-1" title="GitHub stars">
        <Star size={12} aria-hidden /> {gh.stars}
      </span>
      {gh.language !== null && gh.language.length > 0 && (
        <span className="rounded-full bg-white/5 px-2 py-0.5">
          {gh.language}
        </span>
      )}
      <span className="inline-flex items-center gap-1" title="Last push">
        <Clock size={12} aria-hidden /> {formatRelativeUpdated(gh.pushedAt)}
      </span>
    </div>
  )
}