/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  checkSession,
  loginRequest,
  logoutRequest,
  type AdminUser,
} from "@/lib/auth-api"

const STORAGE_KEY = "darun.admin"

interface AuthContextValue {
  user: AdminUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as AdminUser
    if (
      typeof parsed.adminId === "string" &&
      typeof parsed.email === "string"
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function writeStoredUser(user: AdminUser | null): void {
  if (user === null) {
    sessionStorage.removeItem(STORAGE_KEY)
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}): React.JSX.Element {
  const [user, setUser] = useState<AdminUser | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = readStoredUser()
      if (stored === null) {
        if (!cancelled) setIsLoading(false)
        return
      }
      const valid = await checkSession()
      if (cancelled) return
      if (!valid) {
        writeStoredUser(null)
        setUser(null)
      }
      setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const admin = await loginRequest(email, password)
      writeStoredUser(admin)
      setUser(admin)
    },
    []
  )

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest()
    } catch {
      // ! Even if logout fails, clear local state
    } finally {
      writeStoredUser(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, login, logout }),
    [user, isLoading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}