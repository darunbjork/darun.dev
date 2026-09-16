import { GlassCard } from "@/components/glass-card"
import { useCountUp } from "@/hooks/useCountUp"
import { useProjects } from "@/hooks/useProjects"
import { stats, type StatItem } from "@/data/stats"
import type { Project } from "@darun/shared-types"

function computeValue(
  item: StatItem,
  projects: Project[] | undefined,
): number | null {
  if (item.compute === "publishedProjects") {
    return projects?.length ?? null
  }
  if (item.compute === "uniqueTechnologies") {
    if (!projects || projects.length === 0) return null
    const set = new Set<string>()
    for (const p of projects) {
      for (const t of p.techStack ?? []) {
        set.add(t.toLowerCase())
      }
    }
    return set.size
  }
  return item.value
}

function StatCard({
  value,
  label,
  suffix,
}: {
  value: number
  label: string
  suffix?: string
}): React.JSX.Element {
  const { ref, value: current } = useCountUp(value)

  return (
    <GlassCard className="p-6 text-center">
      <span
        ref={ref}
        className="block text-4xl font-bold font-mono text-(--iris-soft)"
      >
        {current.toLocaleString()}
        {suffix ?? ""}
      </span>
      <span className="text-sm text-(--muted)">{label}</span>
    </GlassCard>
  )
}

export function StatsSection(): React.JSX.Element {
  const { projects, isLoading } = useProjects()

  return (
    <section className="px-6 py-20">
      <h2 className="mx-auto mb-8 max-w-6xl text-2xl font-semibold text-(--text)">
        Impact at a glance
      </h2>
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((item) => {
          const value = computeValue(item, projects)
          if (value === null) {
            return (
              <GlassCard key={item.label} className="p-6 text-center">
                <span className="block text-4xl font-bold font-mono text-(--muted)">
                  {isLoading ? "…" : "—"}
                </span>
                <span className="text-sm text-(--muted)">{item.label}</span>
              </GlassCard>
            )
          }
          return (
            <StatCard
              key={item.label}
              value={value}
              label={item.label}
              suffix={item.suffix}
            />
          )
        })}
      </div>
    </section>
  )
}