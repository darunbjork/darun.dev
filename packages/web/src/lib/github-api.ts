import { api, getData, type ApiEnvelope } from "@/lib/api"
import type { Project } from "@darun/shared-types"

export type GithubProfile = {
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

export type GithubRepo = {
  id: number
  name: string
  fullName: string
  description: string | null
  url: string
  homepage: string | null
  language: string | null
  stars: number
  forks: number
  topics: string[]
  pushedAt: string
  updatedAt: string
}

export function fetchGithubProfile(): Promise<GithubProfile> {
  return getData<GithubProfile>("/api/v1/github/profile")
}

export function fetchGithubRepos(): Promise<GithubRepo[]> {
  return getData<GithubRepo[]>("/api/v1/github/repos")
}

export function fetchAdminGithubRepos(): Promise<GithubRepo[]> {
  return getData<GithubRepo[]>("/api/v1/admin/github/repos")
}

export async function importGithubRepo(fullName: string): Promise<Project> {
  const res = await api.post<ApiEnvelope<Project>>(
    "/api/v1/admin/github/import",
    { fullName }
  )
  if (!res.data.success) {
    throw new Error(res.data.error ?? "Import failed")
  }
  return res.data.data
}