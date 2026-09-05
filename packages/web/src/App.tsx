import { useEffect, useState } from "react"
import { getData } from "./lib/api.js"

interface HealthPayload {
  status: string
  services?: { db?: string; redis?: string }
}

export function App(): React.JSX.Element {
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await getData<HealthPayload>("/health")
        if (!cancelled) { setHealth(data); setError(null) }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Health check failed")
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ padding: "2rem", maxWidth: 640 }}>
      <h1 style={{ marginBottom: "0.5rem" }}>
        darun<span style={{ color: "#7c3aed" }}>.dev</span>
      </h1>
      <p style={{ color: "#64748b" }}>Frontend Day 43 — API link check</p>
      {error && <p style={{ color: "#f87171" }}>Error: {error}</p>}
      {!error && !health && <p>Backend status: checking…</p>}
      {health && (
        <div>
          <p>Backend status: <strong style={{ color: "#a78bfa" }}>{health.status}</strong></p>
          {health.services && (
            <ul style={{ color: "#64748b" }}>
              <li>db: {health.services.db ?? "n/a"}</li>
              <li>redis: {health.services.redis ?? "n/a"}</li>
            </ul>
          )}
        </div>
      )}
    </div>
  )
}