import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query"
import { getData, api, type ApiEnvelope } from "../lib/api.js"
import type { Project } from "@darun/shared-types"

export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  detail: (slug: string) => [...projectKeys.all, "detail", slug] as const,
}

export function useProjects(): {
  projects: Project[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: UseQueryResult<Project[]>["refetch"]
} {
  const query = useQuery<Project[], Error>({
    queryKey: projectKeys.lists(),
    queryFn: async (): Promise<Project[]> => {
      return getData<Project[]>("/api/v1/projects")
    },
  })

  return {
    projects: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useProject(slug: string): {
  project: Project | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
} {
  const query = useQuery<Project, Error>({
    queryKey: projectKeys.detail(slug),
    queryFn: async (): Promise<Project> => {
      return getData<Project>(`/api/v1/projects/${encodeURIComponent(slug)}`)
    },
    enabled: slug.trim().length > 0,
  })

  return {
    project: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

export function useCreateProject(): {
  createProject: (input: {
    slug: string
    title: string
    description?: string
    techStack?: string[]
    published?: boolean
  }) => Promise<Project>
  isPending: boolean
  isError: boolean
  error: Error | null
} {
  const queryClient = useQueryClient()

  const mutation = useMutation<
    Project,
    Error,
    {
      slug: string
      title: string
      description?: string
      techStack?: string[]
      published?: boolean
    }
  >({
    mutationFn: async (input): Promise<Project> => {
      const res = await api.post<ApiEnvelope<Project>>(
        "/api/v1/admin/projects",
        input
      )
      if (!res.data.success) {
        throw new Error(res.data.error ?? "Create project failed")
      }
      return res.data.data
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })

  return {
    createProject: (input) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  }
}