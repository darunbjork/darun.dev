import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  SITE_CONTENT_LIMITS,
  type SiteContentData,
  type SiteContentResponse,
} from "@darun/shared-types"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Seo } from "@/components/seo"
import { InlineText } from "@/components/inline-text"
import { useSiteContent, useUpdateSiteContent } from "@/hooks/useSiteContent"

const L = SITE_CONTENT_LIMITS

function toInput(site: SiteContentResponse): SiteContentData {
  return {
    heroEyebrow: site.heroEyebrow,
    heroTitle: site.heroTitle,
    heroAccent: site.heroAccent,
    heroBio: site.heroBio,
    aboutSubtitle: site.aboutSubtitle,
    aboutParagraphs: [...site.aboutParagraphs],
    contactBlurb: site.contactBlurb,
  }
}

const inputClass =
  "w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-(--muted)">{label}</span>
      {children}
      {hint !== undefined && (
        <span className="block text-xs text-(--muted)">{hint}</span>
      )}
    </label>
  )
}

export function AdminSiteContentPage(): React.JSX.Element {
  const site = useSiteContent()

  // ! remount the form when a fresh copy arrives (never clobbers unsaved edits)
  return (
    <div className="mx-auto min-h-screen max-w-5xl bg-(--void) px-6 py-10 text-(--text)">
      <Seo title="Admin Site Content" path="/admin/site-content" noIndex />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Site content</h1>
          <p className="text-sm text-(--muted)">
            About, hero and contact copy — used by the site and the AI chat.
            Saved changes go live without a deploy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" asChild>
            <Link to="/admin/projects">Projects</Link>
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link to="/admin/analytics">Analytics</Link>
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link to="/admin/chat">Chat</Link>
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link to="/admin/feedback">Feedback</Link>
          </Button>
          <Button type="button" variant="secondary" asChild>
            <Link to="/">View site</Link>
          </Button>
        </div>
      </div>

      <SiteContentForm
        key={site.updatedAt ?? "defaults"}
        initial={site}
        updatedAt={site.updatedAt}
      />
    </div>
  )
}

function SiteContentForm({
  initial,
  updatedAt,
}: {
  initial: SiteContentResponse
  updatedAt: string | null
}): React.JSX.Element {
  const { save, isSaving } = useUpdateSiteContent()
  const [form, setForm] = useState<SiteContentData>(() => toInput(initial))
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof SiteContentData>(
    key: K,
    value: SiteContentData[K]
  ): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setParagraph(index: number, value: string): void {
    setForm((prev) => ({
      ...prev,
      aboutParagraphs: prev.aboutParagraphs.map((p, i) =>
        i === index ? value : p
      ),
    }))
  }

  function addParagraph(): void {
    setForm((prev) =>
      prev.aboutParagraphs.length >= L.aboutParagraphsMax
        ? prev
        : { ...prev, aboutParagraphs: [...prev.aboutParagraphs, ""] }
    )
  }

  function removeParagraph(index: number): void {
    setForm((prev) => ({
      ...prev,
      aboutParagraphs: prev.aboutParagraphs.filter((_, i) => i !== index),
    }))
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setError(null)
    const trimmed = {
      ...form,
      aboutParagraphs: form.aboutParagraphs
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
    }
    if (trimmed.aboutParagraphs.length === 0) {
      setError("At least one About paragraph is required")
      return
    }
    try {
      await save(trimmed)
      toast.success("Site copy saved — site and AI chat are up to date")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed"
      setError(message)
      toast.error(message)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlassCard className="p-6">
        <form onSubmit={(e) => { void onSubmit(e) }} className="space-y-5">
          <Field label="Hero eyebrow" hint={`${form.heroEyebrow.length}/${L.heroEyebrow}`}>
            <input
              required
              maxLength={L.heroEyebrow}
              value={form.heroEyebrow}
              onChange={(e): void => set("heroEyebrow", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Hero title" hint={`${form.heroTitle.length}/${L.heroTitle}`}>
            <input
              required
              maxLength={L.heroTitle}
              value={form.heroTitle}
              onChange={(e): void => set("heroTitle", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Hero accent (colored tail of the title)"
            hint={`${form.heroAccent.length}/${L.heroAccent}`}
          >
            <input
              required
              maxLength={L.heroAccent}
              value={form.heroAccent}
              onChange={(e): void => set("heroAccent", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Hero bio" hint={`${form.heroBio.length}/${L.heroBio}`}>
            <textarea
              required
              rows={3}
              maxLength={L.heroBio}
              value={form.heroBio}
              onChange={(e): void => set("heroBio", e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field
            label="About subtitle"
            hint={`${form.aboutSubtitle.length}/${L.aboutSubtitle}`}
          >
            <input
              required
              maxLength={L.aboutSubtitle}
              value={form.aboutSubtitle}
              onChange={(e): void => set("aboutSubtitle", e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--muted)">
                About paragraphs ({form.aboutParagraphs.length}/
                {L.aboutParagraphsMax}) — **bold** is supported
              </span>
              <Button
                type="button"
                variant="secondary"
                onClick={addParagraph}
                disabled={
                  form.aboutParagraphs.length >= L.aboutParagraphsMax
                }
              >
                Add paragraph
              </Button>
            </div>

            {form.aboutParagraphs.map((paragraph, index) => (
              <div key={index} className="space-y-1.5">
                <textarea
                  required
                  rows={5}
                  maxLength={L.aboutParagraph}
                  value={paragraph}
                  onChange={(e): void => setParagraph(index, e.target.value)}
                  className={`${inputClass} resize-none`}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-(--muted)">
                    {paragraph.length}/{L.aboutParagraph}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(): void => removeParagraph(index)}
                    disabled={
                      form.aboutParagraphs.length <= L.aboutParagraphsMin
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Field
            label="Contact blurb"
            hint={`${form.contactBlurb.length}/${L.contactBlurb}`}
          >
            <textarea
              required
              rows={2}
              maxLength={L.contactBlurb}
              value={form.contactBlurb}
              onChange={(e): void => set("contactBlurb", e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </Field>

          {error !== null && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <span className="text-xs text-(--muted)">
              {updatedAt === null
                ? "Built-in defaults (nothing saved yet)"
                : `Last saved ${new Date(updatedAt).toLocaleString()}`}
            </span>
          </div>
        </form>
      </GlassCard>

      <GlassCard className="h-fit p-6">
        <p className="mb-4 text-sm text-(--muted)">Preview</p>

        <p className="mb-3 font-mono text-sm text-violet-400">
          {form.heroEyebrow}
        </p>
        <h2 className="mb-2 text-2xl font-semibold text-slate-200">
          {form.heroTitle}
          <span className="text-violet-500">{form.heroAccent}</span>
        </h2>
        <p className="mb-6 text-sm text-slate-300">{form.heroBio}</p>

        <p className="mb-2 text-lg font-semibold text-(--text)">About</p>
        <p className="mb-4 font-mono text-sm text-(--iris-soft)">
          {form.aboutSubtitle}
        </p>
        <div className="mb-6 space-y-4 text-sm text-slate-300">
          {form.aboutParagraphs
            .filter((p) => p.trim().length > 0)
            .map((paragraph, index) => (
              <p key={index}>
                <InlineText text={paragraph} />
              </p>
            ))}
        </div>

        <p className="text-lg font-semibold text-(--text)">Let's talk</p>
        <p className="text-sm text-slate-300">{form.contactBlurb}</p>
      </GlassCard>
    </div>
  )
}
