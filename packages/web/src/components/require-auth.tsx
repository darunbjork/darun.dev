import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export function RequireAuth({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-(--muted)">
        Checking session…
      </div>
    )
  }

  if (user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}