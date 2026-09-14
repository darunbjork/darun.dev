import { GlassCard } from "@/components/glass-card"
import { useRecentFeedback } from "@/hooks/useFeedback"
import { formatRelativeUpdated } from "@/lib/github-match"

export function TestimonialsSection() {
  const { data, isLoading, isError } = useRecentFeedback(6)

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-(--text)">
          What visitors say
        </h2>
        <p className="mt-2 text-sm text-(--muted)">Loading…</p>
      </section>
    )
  }

  if (isError || !data?.length) {
    return null
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-(--text)">
        What visitors say
      </h2>
      <p className="mt-2 text-sm text-(--muted)">
        Approved feedback from people who explored the work.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
          <li key={item.id}>
            <GlassCard className="h-full p-5">
              <div className="flex items-center justify-between gap-2 text-xs text-(--muted)">
                <span className="truncate">{item.projectSlug}</span>
                <span>{formatRelativeUpdated(item.createdAt)}</span>
              </div>
              <div className="mt-2 text-sm text-amber-400/90">
                {"★".repeat(item.rating)}
                <span className="text-(--muted)">
                  {"★".repeat(Math.max(0, 5 - item.rating))}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-(--text)">
                {item.comment}
              </p>
            </GlassCard>
          </li>
        ))}
      </ul>
    </section>
  )
}