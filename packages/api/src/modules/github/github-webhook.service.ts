import type { FastifyInstance } from "fastify"
import { env } from "../../env.js"
import { CacheKey } from "../../utils/cache.js"
import { createIngestService } from "../rag/ingest.service.js"

export class GithubWebhookService {
  constructor(private readonly fastify: FastifyInstance) {}

  isDefaultBranchPush(payload: {
    ref?: string
    repository?: { default_branch?: string; full_name?: string }
  }): boolean {
    const ref = payload.ref ?? ""
    const defaultBranch = payload.repository?.default_branch ?? "main"
    return ref === `refs/heads/${defaultBranch}`
  }

  fullNameFromPayload(payload: {
    repository?: { full_name?: string }
  }): string | null {
    const name = payload.repository?.full_name
    return typeof name === "string" && name.includes("/") ? name : null
  }

  /** Only repos owned by GITHUB_USERNAME */
  isAllowedRepo(fullName: string): boolean {
    const username = env.GITHUB_USERNAME
    const owner = fullName.split("/")[0]?.toLowerCase()
    return owner === username.toLowerCase()
  }

  async handlePush(payload: {
    ref?: string
    repository?: { default_branch?: string; full_name?: string }
  }): Promise<{
    ingested: boolean
    fullName?: string
    reason?: string
    deleted?: number
    inserted?: number
  }> {
    if (!this.isDefaultBranchPush(payload)) {
      return { ingested: false, reason: "not_default_branch" }
    }

    const fullName = this.fullNameFromPayload(payload)
    if (!fullName) {
      return { ingested: false, reason: "missing_repo" }
    }

    if (!this.isAllowedRepo(fullName)) {
      this.fastify.log.warn({ fullName }, "webhook repo not allowed")
      return { ingested: false, reason: "repo_not_allowed" }
    }

    const ingest = createIngestService(this.fastify)
    const result = await ingest.ingestReadme(fullName)

    await this.fastify.redis.del(
      CacheKey.githubProfile(env.GITHUB_USERNAME),
      CacheKey.githubRepos(env.GITHUB_USERNAME)
    )

    return {
      ingested: true,
      fullName,
      deleted: result.deleted,
      inserted: result.inserted,
    }
  }
}