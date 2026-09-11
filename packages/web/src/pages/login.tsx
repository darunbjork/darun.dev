import { useState, type FormEvent } from "react"
import { useLocation, useNavigate, Navigate } from "react-router-dom"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { Seo } from "@/components/seo"
import { useAuth } from "@/hooks/useAuth"

export function LoginPage(): React.JSX.Element {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from ?? "/admin/projects"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && user !== null) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--void) px-4">
      <Seo title="Owner Login" path="/login" noIndex />

      <GlassCard
        elevated
        glow="iris"
        className="w-full max-w-sm p-6"
      >
        <h1 className="text-xl font-semibold text-(--text)">
          Owner login
        </h1>
        <p className="mt-1 text-sm text-(--muted)">
          Manage projects and analytics for darun.dev
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-(--muted)">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e): void => setEmail(e.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm text-(--muted)">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e): void => setPassword(e.target.value)}
              className="w-full rounded-lg border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
            />
          </label>

          {error !== null && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || email.length === 0 || password.length === 0}
            className="w-full"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}