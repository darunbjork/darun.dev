import { Link } from "react-router-dom"
import { useState } from "react"
import { Seo } from "@/components/seo"
import { Button } from "@/components/ui/button"
import {
  useAdminFeedbackList,
  useSetFeedbackApproved,
} from "@/hooks/useAdminFeedback"
import { formatRelativeUpdated } from "@/lib/github-match"

type Status = "pending" | "approved" | "all"

export function AdminFeedbackPage() {
  const [status, setStatus] = useState<Status>("pending")
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useAdminFeedbackList(status, page)
  const mutate = useSetFeedbackApproved()

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-(--void) px-6 py-10 text-(--text)">
      <Seo title="Admin Feedback" path="/admin/feedback" noIndex />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Feedback</h1>
          <p className="text-sm text-(--muted)">
            Approve comments before they appear publicly.
          </p>
        </div>
        <Button type="button" variant="secondary" asChild>
          <Link to="/admin/projects">← Back to projects</Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
            className={
              status === s
                ? "rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white"
                : "rounded-lg border border-(--border) px-3 py-1.5 text-sm text-(--text)"
            }
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-(--muted)">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-400">
          {error instanceof Error ? error.message : "Failed to load"}
        </p>
      ) : (
        <ul className="space-y-3">
          {(data?.items ?? []).map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-(--border) bg-(--void)/50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-(--muted)">
                <span className="font-medium text-(--text)">
                  {item.projectSlug}
                </span>
                <span>{formatRelativeUpdated(item.createdAt)}</span>
              </div>
              <div className="mt-1 text-sm text-amber-400/90">
                {"★".repeat(item.rating)} · {item.like ? "Like" : "Dislike"} ·{" "}
                {item.approved ? "Approved" : "Pending"}
              </div>
              <p className="mt-2 text-sm text-slate-200">{item.comment}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={mutate.isPending || item.approved}
                  onClick={() => mutate.mutate({ id: item.id, approved: true })}
                  className="rounded-lg bg-emerald-600/90 px-3 py-1 text-xs text-white disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={mutate.isPending || !item.approved}
                  onClick={() =>
                    mutate.mutate({ id: item.id, approved: false })
                  }
                  className="rounded-lg border border-(--border) px-3 py-1 text-xs text-(--text) disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
          {!isLoading && (data?.items ?? []).length === 0 && (
            <li className="rounded-xl border border-(--border) p-6 text-sm text-(--muted)">
              No feedback in this view.
            </li>
          )}
        </ul>
      )}

      {data && data.total > data.pageSize ? (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-(--border) px-2 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-(--muted)">
            Page {data.page} · {data.total} total
          </span>
          <button
            type="button"
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-(--border) px-2 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}