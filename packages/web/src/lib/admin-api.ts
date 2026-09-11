import type { Project } from "@darun/shared-types"
import { api, getData, type ApiEnvelope } from "@/lib/api"

export interface CreateProjectInput {
  slug: string
  title: string
  description?: string
  techStack?: string[]
  problem?: string
  solution?: string
  impact?: string
  learnings?: string
  badge?: string
  order?: number
  featured?: boolean
  published?: boolean
  repoUrl?: string
  liveUrl?: string
  coverUrl?: string
  coverPublicId?: string
}

export type UpdateProjectInput = CreateProjectInput

export async function listAdminProjects(): Promise<Project[]> {
  return getData<Project[]>("/api/v1/admin/projects")
}

export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  const res = await api.post<ApiEnvelope<Project>>(
    "/api/v1/admin/projects",
    input
  )
  if (!res.data.success) throw new Error(res.data.error ?? "Create failed")
  return res.data.data
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput
): Promise<Project> {
  // ! PUT (not PATCH) — matches the API contract
  const res = await api.put<ApiEnvelope<Project>>(
    `/api/v1/admin/projects/${id}`,
    input
  )
  if (!res.data.success) throw new Error(res.data.error ?? "Update failed")
  return res.data.data
}

export async function deleteProject(id: string): Promise<void> {
  const res = await api.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/api/v1/admin/projects/${id}`
  )
  if (!res.data.success) throw new Error(res.data.error ?? "Delete failed")
}

export interface UploadedImage {
  id: string
  url: string
  publicId: string
  width: number
  height: number
  format: string
  bytes: number
  alt: string | null
  order: number
}

export async function uploadProjectImage(
  projectId: string,
  file: File,
  alt?: string
): Promise<UploadedImage> {
  const form = new FormData()
  form.append("file", file)
  if (alt !== undefined && alt.length > 0) form.append("alt", alt)

  const res = await api.post<ApiEnvelope<UploadedImage>>(
    `/api/v1/admin/projects/${projectId}/images`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  )
  if (!res.data.success) throw new Error(res.data.error ?? "Upload failed")
  return res.data.data
}

export async function deleteProjectImage(
  projectId: string,
  imageId: string
): Promise<void> {
  const res = await api.delete<ApiEnvelope<{ deleted: boolean }>>(
    `/api/v1/admin/projects/${projectId}/images/${imageId}`
  )
  if (!res.data.success) throw new Error(res.data.error ?? "Delete failed")
}