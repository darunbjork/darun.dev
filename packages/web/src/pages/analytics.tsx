import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { GlassCard } from "@/components/glass-card"
import {
  useDashboardStats,
  useSessionAnalytics,
} from "@/hooks/useAnalyticsDashboard"

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: string
}) {
  return (
    <GlassCard className="p-4">
      <p className="text-xs text-(--muted)">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${accent}`}>{value}</p>
    </GlassCard>
  )
}

const BUCKET_COLORS: Record<string, string> = {
  negative: "#f87171",
  neutral: "#64748b",
  positive: "#a78bfa",
  unknown: "#334155",
}

export function AnalyticsPage() {
  const {
    stats,
    isLoading: loadingStats,
    isError: statsError,
    error: statsErr,
  } = useDashboardStats()
  const {
    data: sessions,
    isLoading: loadingSessions,
    isError: sessionsError,
    error: sessionsErr,
  } = useSessionAnalytics()

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-(--void) px-6 py-10 text-(--text)">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="mb-8 text-sm text-(--muted)">
        Admin dashboard — requires authenticated session
      </p>

      {(statsError || sessionsError) && (
        <GlassCard className="mb-6 p-4 text-sm text-red-400">
          {statsErr?.message ??
            sessionsErr?.message ??
            "Failed to load analytics (login as admin?)"}
        </GlassCard>
      )}

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-medium text-(--muted)">Overview</h2>
        {loadingStats && <p className="text-sm text-(--muted)">Loading stats…</p>}
        {stats && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Visitors"
              value={stats.totalVisitors}
              accent="text-(--iris-soft)"
            />
            <StatCard
              label="Views"
              value={stats.totalViews}
              accent="text-(--ember-soft)"
            />
            <StatCard
              label="Feedback"
              value={stats.totalFeedback}
              accent="text-(--text)"
            />
            <StatCard
              label="Chats today"
              value={stats.chatsToday}
              accent="text-(--iris)"
            />
            <StatCard
              label="Recruiters"
              value={stats.activeRecruiters}
              accent="text-(--ember)"
            />
            <StatCard
              label="Pos. sentiment"
              value={stats.positiveSentiment}
              accent="text-(--iris-soft)"
            />
          </div>
        )}
      </section>

      <section className="mb-10 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-4">
          <h2 className="mb-4 text-sm font-medium text-(--muted)">Top projects</h2>
          <ul className="space-y-2">
            {(stats?.topProjects ?? []).map((p) => (
              <li key={p.slug} className="flex items-center justify-between text-sm">
                <span>{p.title}</span>
                <span className="font-mono text-(--muted)">{p.views} views</span>
              </li>
            ))}
            {(stats?.topProjects ?? []).length === 0 && (
              <li className="text-sm text-(--muted)">No data yet</li>
            )}
          </ul>
        </GlassCard>

        <GlassCard className="p-4">
          <h2 className="mb-4 text-sm font-medium text-(--muted)">Sentiment distribution</h2>
          {loadingSessions && <p className="text-sm text-(--muted)">Loading…</p>}
          {sessions && (
            <>
              <p className="mb-3 text-xs text-(--muted)">
                Sessions: {sessions.totalSessions} · Ended: {sessions.endedSessions} · Avg sentiment:{" "}
                {sessions.avgSentiment !== null ? sessions.avgSentiment.toFixed(2) : "n/a"}
              </p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessions.sentimentDistribution}>
                    <XAxis dataKey="bucket" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#111118",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {sessions.sentimentDistribution.map((entry) => (
                        <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? "#64748b"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </GlassCard>
      </section>

      <section>
        <GlassCard className="p-4">
          <h2 className="mb-4 text-sm font-medium text-(--muted)">Sessions by user type</h2>
          <ul className="space-y-2">
            {(sessions?.byUserType ?? []).map((row) => (
              <li key={row.userType} className="flex justify-between text-sm">
                <span>{row.userType}</span>
                <span className="font-mono text-(--muted)">{row.count}</span>
              </li>
            ))}
            {(sessions?.byUserType ?? []).length === 0 && (
              <li className="text-sm text-(--muted)">No sessions yet</li>
            )}
          </ul>
        </GlassCard>
      </section>
    </div>
  )
}