import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Seo } from "@/components/seo"
import {
  useAdminProjects,
  useCreateProject,
  useUpdateProject,
  useUploadProjectImage,
} from "@/hooks/useAdminProjects"
import type { CreateProjectInput } from "@/lib/admin-api"

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const empty: CreateProjectInput = {
  title: "",
  slug: "",
  description: "",
  techStack: [],
  problem: "",
  solution: "",
  impact: "",
  learnings: "",
  badge: "",
  featured: false,
  published: false,
  repoUrl: "",
  liveUrl: "",
}

export function AdminProjectFormPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === "new"
  const navigate = useNavigate()

  const { projects } = useAdminProjects()
  const create = useCreateProject()
  const update = useUpdateProject()
  const upload = useUploadProjectImage()

  const existing = !isNew && id !== undefined
    ? projects?.find((p) => p.id === id)
    : undefined

  const [form, setForm] = useState<CreateProjectInput>(() => {
    if (existing === undefined) return empty

    return {
      title: existing.title,
      slug: existing.slug,
      description: existing.description ?? "",
      techStack: existing.techStack ?? [],
      problem: existing.problem ?? "",
      solution: existing.solution ?? "",
      impact: existing.impact ?? "",
      learnings: existing.learnings ?? "",
      badge: existing.badge ?? "",
      featured: existing.featured ?? false,
      published: existing.published ?? false,
      repoUrl: existing.repoUrl ?? "",
      liveUrl: existing.liveUrl ?? "",
    }
  })
  const [techInput, setTechInput] = useState(() => (existing?.techStack ?? []).join(", "))
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof CreateProjectInput>(
    key: K,
    value: CreateProjectInput[K]
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    const body: CreateProjectInput = {
      ...form,
      slug: form.slug.length > 0 ? form.slug : slugify(form.title),
      techStack: techInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    }

    try {
      if (isNew) {
        const created = await create.mutateAsync(body)
        navigate(`/admin/projects/${created.id}`, { replace: true })
      } else if (id !== undefined) {
        await update.mutateAsync({ id, input: body })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  async function onCoverChange(file: File | null): Promise<void> {
    if (file === null) return
    if (isNew || id === undefined) {
      setError("Save the project first, then upload a cover.")
      return
    }
    try {
      await upload.mutateAsync({ projectId: id, file })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed")
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-(--void) px-6 py-10 text-(--text)">
      <Seo title={isNew ? "New Project" : "Edit Project"} path="/admin/projects" noIndex />

      <h1 className="mb-6 text-2xl font-semibold">
        {isNew ? "New project" : "Edit project"}
      </h1>

      <GlassCard className="p-6">
        <form onSubmit={(e) => { void onSubmit(e) }} className="space-y-5">
          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(e): void => {
                set("title", e.target.value)
                if (isNew) set("slug", slugify(e.target.value))
              }}
              className="w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
            />
          </Field>

          <Field label="Slug (URL)">
            <input
              required
              value={form.slug}
              onChange={(e): void => set("slug", e.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 font-mono text-sm text-(--text) outline-none focus:border-(--iris)"
            />
          </Field>

          <Field label="Description">
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e): void => set("description", e.target.value)}
              className="w-full resize-none rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
            />
          </Field>

          <Field label="Tech stack (comma-separated)">
            <input
              value={techInput}
              onChange={(e): void => setTechInput(e.target.value)}
              placeholder="TypeScript, Fastify, Prisma"
              className="w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Problem">
              <textarea
                rows={3}
                value={form.problem ?? ""}
                onChange={(e): void => set("problem", e.target.value)}
                className="w-full resize-none rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
              />
            </Field>
            <Field label="Solution">
              <textarea
                rows={3}
                value={form.solution ?? ""}
                onChange={(e): void => set("solution", e.target.value)}
                className="w-full resize-none rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Impact">
              <textarea
                rows={2}
                value={form.impact ?? ""}
                onChange={(e): void => set("impact", e.target.value)}
                className="w-full resize-none rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
              />
            </Field>
            <Field label="Learnings">
              <textarea
                rows={2}
                value={form.learnings ?? ""}
                onChange={(e): void => set("learnings", e.target.value)}
                className="w-full resize-none rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Repo URL">
              <input
                value={form.repoUrl ?? ""}
                onChange={(e): void => set("repoUrl", e.target.value)}
                placeholder="https://github.com/..."
                className="w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
              />
            </Field>
            <Field label="Live URL">
              <input
                value={form.liveUrl ?? ""}
                onChange={(e): void => set("liveUrl", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.published ?? false}
                onChange={(e): void => set("published", e.target.checked)}
              />
              <span className="text-(--text)">Published</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured ?? false}
                onChange={(e): void => set("featured", e.target.checked)}
              />
              <span className="text-(--text)">Featured</span>
            </label>
          </div>

          {!isNew && (
            <Field label="Cover image">
              {existing?.coverUrl !== null &&
                existing?.coverUrl !== undefined &&
                existing.coverUrl.length > 0 && (
                  <img
                    src={existing.coverUrl}
                    alt="Current cover"
                    className="mb-2 max-h-40 rounded-lg object-cover"
                  />
                )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e): void => {
                  void onCoverChange(e.target.files?.[0] ?? null)
                }}
                className="block w-full text-sm text-(--muted) file:mr-4 file:rounded-lg file:border-0 file:bg-(--iris) file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-(--iris)/80"
              />
              {upload.isPending && (
                <p className="mt-1 text-xs text-(--muted)">Uploading…</p>
              )}
            </Field>
          )}

          {isNew && (
            <p className="text-sm text-(--muted)">
              Save once, then upload a cover on the edit screen.
            </p>
          )}

          {error !== null && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(): void => {
                void navigate("/admin/projects")
              }}
            >
              Back
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-(--muted)">{label}</span>
      {children}
    </label>
  )
}