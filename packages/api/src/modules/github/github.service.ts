import type { FastifyInstance } from "fastify"
import { env } from "../../env.js"
import { CacheKey, TTL, getOrSet } from "../../utils/cache.js"
import {
  fetchProfile,
  fetchRepos,
  type GhRepo,
  type GhUser,
} from "./github.client.js"

export class GithubService {
  constructor(private readonly app: FastifyInstance) {}

  private get username(): string {
    return env.GITHUB_USERNAME
  }

  async getProfile(): Promise<GhUser> {
    const key = CacheKey.githubProfile(this.username)
    return getOrSet(this.app.redis, key, TTL.GITHUB_PROFILE, () =>
      fetchProfile(this.username)
    )
  }

  async getRepos(
    opts: { includeForks?: boolean; includeArchived?: boolean } = {}
  ): Promise<GhRepo[]> {
    const key = CacheKey.githubRepos(this.username)
    const repos = await getOrSet(this.app.redis, key, TTL.GITHUB_REPOS, () =>
      fetchRepos(this.username, 50)
    )

    return repos.filter((r) => {
      if (!opts.includeForks && r.fork) return false
      if (!opts.includeArchived && r.archived) return false
      return true
    })
  }
}