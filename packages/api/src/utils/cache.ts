import type { Redis } from "ioredis"

/** TTLs in seconds. */
export const TTL = {
  PROJECTS_LIST: 60,   // 1 min — invalidated on publish/update/delete
  PROJECT_DETAIL: 60,  // 1 min — invalidated on update/delete
  ANALYTICS: 60,       // 1 min — aggregated dashboard stats
  FEEDBACK_STATS: 120, // 2 min — slower-changing per-project stats
} as const

export const CacheKey = {
  projectsList: (): string => "projects:list",
  projectDetail: (slug: string): string => `projects:detail:${slug}`,
  analytics: (): string => "analytics:dashboard",
  feedbackStats: (slug: string): string => `feedback:stats:${slug}`,
  sessionAnalytics: (): string => "analytics:sessions",
} as const

export async function getOrSet<T>(
  redis: Redis,
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached !== null) {
    return JSON.parse(cached) as T
  }

  const value = await factory()
  await redis.setex(key, ttlSeconds, JSON.stringify(value))
  return value
}

export async function invalidate(
  redis: Redis,
  ...keys: string[]
): Promise<void> {
  if (keys.length === 0) return
  await redis.del(...keys)
}