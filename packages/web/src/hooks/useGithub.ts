import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchGithubProfile,
  fetchGithubRepos,
  fetchAdminGithubRepos,
  importGithubRepo,
  type GithubProfile,
  type GithubRepo,
} from "@/lib/github-api"
import type { Project } from "@darun/shared-types"

export const githubKeys = {
  all: ["github"] as const,
  profile: () => [...githubKeys.all, "profile"] as const,
  repos: () => [...githubKeys.all, "repos"] as const,
  adminRepos: () => [...githubKeys.all, "admin", "repos"] as const,
}

export function useGithubProfile() {
  return useQuery<GithubProfile, Error>({
    queryKey: githubKeys.profile(),
    queryFn: fetchGithubProfile,
    staleTime: 15 * 60 * 1000,
  })
}

export function useGithubRepos() {
  return useQuery<GithubRepo[], Error>({
    queryKey: githubKeys.repos(),
    queryFn: fetchGithubRepos,
    staleTime: 15 * 60 * 1000,
  })
}

export function useAdminGithubRepos() {
  return useQuery<GithubRepo[], Error>({
    queryKey: githubKeys.adminRepos(),
    queryFn: fetchAdminGithubRepos,
    staleTime: 5 * 60 * 1000,
  })
}

export function useImportGithubRepo() {
  const qc = useQueryClient()
  return useMutation<Project, Error, string>({
    mutationFn: importGithubRepo,
    onSuccess: (): void => {
      void qc.invalidateQueries({ queryKey: ["projects"] })
      void qc.invalidateQueries({ queryKey: ["admin", "projects"] })
    },
  })
}