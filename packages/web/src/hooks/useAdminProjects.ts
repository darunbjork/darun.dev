import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Project } from "@darun/shared-types"
import {
  createProject,
  deleteProject,
  deleteProjectImage,
  listAdminProjects,
  updateProject,
  uploadProjectImage,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/admin-api"
import { projectKeys } from "@/hooks/useProjects"

const adminKey = ["admin", "projects"] as const

export function useAdminProjects(): {
  projects: Project[] | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  const q = useQuery<Project[], Error>({
    queryKey: adminKey,
    queryFn: listAdminProjects,
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

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminKey })
      await qc.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      updateProject(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminKey })
      await qc.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminKey })
      await qc.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useUploadProjectImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      file,
      alt,
    }: {
      projectId: string
      file: File
      alt?: string
    }) => uploadProjectImage(projectId, file, alt),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminKey })
      await qc.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useDeleteProjectImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      imageId,
    }: {
      projectId: string
      imageId: string
    }) => deleteProjectImage(projectId, imageId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminKey })
      await qc.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}