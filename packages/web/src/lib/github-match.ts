import type { GithubRepo } from "./github-api"

function normalize(url: string): string {
  return url.trim().replace(/\.git$/i, "").replace(/\/$/, "").toLowerCase()
}

export function matchGithubRepo(
  repoUrl: string | null | undefined,
  repos: GithubRepo[] | undefined
): GithubRepo | null {
  if (!repoUrl || repoUrl.length === 0 || !repos || repos.length === 0) return null
  const target = normalize(repoUrl)
  return (
    repos.find((r) => normalize(r.url) === target) ??
    repos.find((r) => target.endsWith(r.fullName.toLowerCase())) ??
    null
  )
}

export function formatRelativeUpdated(iso: string): string {
  const then = new Date(iso).getTime()
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "1d ago"
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}