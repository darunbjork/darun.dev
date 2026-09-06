import { useState } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import {
  useChatSessions,
  useChatTranscript,
  type ChatSessionListItem,
} from "@/hooks/useChatSessions"
import { cn } from "@/lib/utils"

const USER_TYPES = [
  "all",
  "Unknown",
  "Recruiter",
  "Developer",
  "Client",
  "Other",
] as const

export function ChatDashboardPage(): React.JSX.Element {
  const [filter, setFilter] = useState<string>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { sessions, isLoading, isError, error, refetch } = useChatSessions(
    filter === "all" ? undefined : filter
  )
  const { transcript, isLoading: loadingTx } = useChatTranscript(selectedId)

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-(--void) px-6 py-10 text-(--text)">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chat sessions</h1>
          <p className="text-sm text-(--muted)">
            Admin review — requires authenticated API session
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={refetch}>
          Refresh
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {USER_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={(): void => setFilter(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              filter === t
                ? "border-(--iris) bg-(--iris) text-white"
                : "border-(--border) text-(--muted)"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isError && (
        <GlassCard className="mb-4 p-4 text-sm text-red-400">
          {error?.message ?? "Failed to load sessions (are you logged in as admin?)"}
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-4">
          <h2 className="mb-3 text-sm font-medium text-(--muted)">
            Sessions
          </h2>
          {isLoading && (
            <p className="text-sm text-(--muted)">Loading…</p>
          )}
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {(sessions ?? []).map((s: ChatSessionListItem) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={(): void => setSelectedId(s.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    selectedId === s.id
                      ? "border-(--iris) bg-(--iris)/10"
                      : "border-(--border) hover:border-(--iris)/40"
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{s.userType}</span>
                    <span className="font-mono text-xs text-(--muted)">
                      {s.messageCount} msgs
                    </span>
                  </div>
                  <div className="text-xs text-(--muted)">
                    {new Date(s.startedAt).toLocaleString()}
                    {s.hasNotes ? " · notes" : ""}
                    {s.sentimentScore !== null
                      ? ` · sentiment ${s.sentimentScore.toFixed(2)}`
                      : ""}
                  </div>
                </button>
              </li>
            ))}
            {!isLoading && (sessions ?? []).length === 0 && (
              <li className="text-sm text-(--muted)">No sessions</li>
            )}
          </ul>
        </GlassCard>

        <GlassCard className="p-4">
          <h2 className="mb-3 text-sm font-medium text-(--muted)">
            Transcript
          </h2>
          {selectedId === null && (
            <p className="text-sm text-(--muted)">Select a session</p>
          )}
          {loadingTx && (
            <p className="text-sm text-(--muted)">Loading transcript…</p>
          )}
          {transcript !== undefined && transcript !== null && (
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap wrap-break-word rounded-lg bg-(--void) p-3 font-mono text-xs text-(--text)">
              {JSON.stringify(transcript, null, 2)}
            </pre>
          )}
        </GlassCard>
      </div>
    </div>
  )
}