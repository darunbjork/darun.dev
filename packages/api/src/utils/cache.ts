import type { Redis } from "ioredis"

export const TTL = {
  PROJECTS_LIST: 60,
  PROJECT_DETAIL: 60,
  ANALYTICS: 60,
} as const

export const CacheKey = {
  projectsList: (): string => "projects:list",
  projectDetail: (slug: string): string => `projects:detail:${slug}`,
  analytics: (): string => "analytics:dashboard",
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