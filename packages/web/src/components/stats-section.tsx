import { GlassCard } from "@/components/glass-card"
import { useCountUp } from "@/hooks/useCountUp"
import { stats, type StatItem } from "@/data/stats"

function Stat({ value, label, suffix = "+" }: StatItem): React.JSX.Element {
  const { ref, value: current } = useCountUp(value)

  return (
    <GlassCard className="p-6 text-center">
      <span
        ref={ref}
        className="block font-mono text-3xl font-bold text-(--iris-soft)] sm:text-4xl"
      >
        {current.toLocaleString()}
        {suffix}
      </span>
      <span className="mt-2 block text-sm text-(--muted)]">{label}</span>
    </GlassCard>
  )
}

export function StatsSection(): React.JSX.Element {
  return (
    <section
      id="stats"
      className="mx-auto max-w-6xl px-6 py-20"
      aria-label="Key metrics"
    >
      <h2 className="mb-8 text-2xl font-semibold text-(--text)]">
        Impact at a glance
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <Stat key={item.label} {...item} />
        ))}
      </div>
    </section>
  )
}