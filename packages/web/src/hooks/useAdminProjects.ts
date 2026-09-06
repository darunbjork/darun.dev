import { useQuery } from "@tanstack/react-query"
import type { Project } from "@darun/shared-types"
import { getData } from "@/lib/api"

export function useAdminProjects(): {
  projects: Project[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  const q = useQuery<Project[], Error>({
    queryKey: ["admin", "projects"],
    queryFn: async (): Promise<Project[]> => {
      return getData<Project[]>("/api/v1/admin/projects")
    },
    retry: false,
  })

  return {
    projects: q.data,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    refetch: (): void => {
      void q.refetch()
    },
  }
}