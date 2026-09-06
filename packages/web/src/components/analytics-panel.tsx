import { GlassCard } from "@/components/glass-card"
import type { ProjectAnalytics } from "@/hooks/useAnalytics"

// TODO: Add a chart for views over time, and a chart for ratings over time. This will require a new API endpoint to fetch the data, and a new hook to fetch the data. The charts can be implemented using a library like Chart.js or Recharts.
function Metric({ label, value, accent }: { label: string; value: string | number; accent: string }): React.JSX.Element {
  return (
    <div>
      <div className={`font-mono text-2xl font-bold ${accent}`}>{value}</div>
      <div className="text-xs text-(--muted)]">{label}</div>
    </div>
  )
}

export function AnalyticsPanel({ data }: { data: ProjectAnalytics | null }): React.JSX.Element {
  if (data === null) {
    return <p className="text-sm text-(--muted)]">Loading analytics…</p>
  }

  return (
    <GlassCard className="space-y-3 p-4">
      <h4 className="text-sm font-medium text-(--muted)]">Live stats</h4>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Views" value={data.views} accent="text-[var(--ember-soft)]" />
        <Metric label="Unique" value={data.uniqueVisitors} accent="text-[var(--iris-soft)]" />
        <Metric label="Avg rating" value={Number(data.averageRating.toFixed(1))} accent="text-[var(--ember)]" />
        <Metric label="Likes" value={data.likeCount} accent="text-[var(--text)]" />
      </div>
    </GlassCard>
  )
}