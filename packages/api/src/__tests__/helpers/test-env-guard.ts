// ! Tests run deleteMany/create against the configured database. Refuse to
// ! start unless every data store is on this machine, so a stray .env or
// ! exported shell variable can never point the suite at production.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"])
const GUARDED_VARS = ["DATABASE_URL", "REDIS_URL"] as const

type GuardedEnv = Partial<Record<(typeof GUARDED_VARS)[number], string>>

function isLocal(raw: string | undefined): boolean {
  if (raw === undefined || raw.length === 0) return false
  try {
    return LOCAL_HOSTS.has(new URL(raw).hostname.toLowerCase())
  } catch {
    return false
  }
}

export function assertLocalTestEnv(env: GuardedEnv = process.env): void {
  const offending = GUARDED_VARS.filter((name) => !isLocal(env[name]))
  if (offending.length === 0) return

  // ! Name the variables only — never echo the URL, it may hold credentials.
  throw new Error(
    `Refusing to run tests: ${offending.join(", ")} must point at localhost or 127.0.0.1. ` +
      "Tests delete and create rows. Run `docker compose up -d postgres redis` and use the " +
      "values in .env.test at the repo root, or export local URLs."
  )
}
