import { env } from "../../env.js"
import { AppError } from "../../utils/errors.js"

const GITHUB_API = "https://api.github.com"

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "darun.dev-portfolio",
  }
  if (env.GITHUB_TOKEN) h.Authorization = `Bearer ${env.GITHUB_TOKEN}`
  return h
}

async function gh<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${GITHUB_API}${path}`, { headers: headers() })
  } catch {
    throw new AppError("GitHub unreachable", 502, "GITHUB_UNAVAILABLE")
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new AppError("GitHub resource not found", 404, "GITHUB_NOT_FOUND")
    }
    if (res.status === 403 || res.status === 429) {
      throw new AppError("GitHub rate limit exceeded", 503, "GITHUB_RATE_LIMIT")
    }
    throw new AppError("GitHub unavailable", 502, "GITHUB_UNAVAILABLE")
  }

  return (await res.json()) as T
}

export type GhUser = {
  login: string
  name: string | null
  bio: string | null
  avatar_url: string
  html_url: string
  public_repos: number
  followers: number
  following: number
  company: string | null
  location: string | null
  blog: string | null
}

export type GhRepo = {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  topics: string[]
  fork: boolean
  archived: boolean
  pushed_at: string
  updated_at: string
  created_at: string
}

export function fetchProfile(username: string): Promise<GhUser> {
  return gh<GhUser>(`/users/${encodeURIComponent(username)}`)
}

export function fetchRepos(username: string, perPage = 50): Promise<GhRepo[]> {
  const q = new URLSearchParams({
    sort: "updated",
    direction: "desc",
    per_page: String(perPage),
    type: "owner",
  })
  return gh<GhRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?${q.toString()}`
  )
}