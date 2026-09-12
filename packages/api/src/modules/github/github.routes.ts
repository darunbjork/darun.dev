import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { GithubService } from "./github.service.js"
import { GithubImportService } from "./github.import.service.js"
import { authGuard } from "../../middleware/auth.guard.js"
import { ValidationError } from "../../utils/errors.js"
import { ok } from "../../utils/response.js"
import { env } from "../../env.js"

const githubRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const service = new GithubService(fastify)
  const importer = new GithubImportService(fastify)

  const csrfPreHandler =
    env.NODE_ENV === "production"
      ? fastify.csrfProtection
      : (_request: unknown, _reply: unknown, done: (err?: Error | null) => void) =>
          done()

  // ─── Public ──────────────────────────────────────────────
  fastify.get(
    "/api/v1/github/profile",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const data = await service.getProfile()
      return reply.status(200).send(ok(data, request.correlationId))
    }
  )

  fastify.get(
    "/api/v1/github/repos",
    { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const q = request.query as { forks?: string; archived?: string }
      const repos = await service.getRepos({
        includeForks: q.forks === "1",
        includeArchived: q.archived === "1",
      })

      const projected = repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        url: r.html_url,
        homepage: r.homepage,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics ?? [],
        pushedAt: r.pushed_at,
        updatedAt: r.updated_at,
      }))

      return reply.status(200).send(ok(projected, request.correlationId))
    }
  )

  // ─── Admin ───────────────────────────────────────────────
  fastify.get(
    "/api/v1/admin/github/repos",
    {
      preHandler: [authGuard],
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const repos = await importer.listImportableRepos()
      const projected = repos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        url: r.html_url,
        homepage: r.homepage,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics ?? [],
        pushedAt: r.pushed_at,
        updatedAt: r.updated_at,
      }))
      return reply.status(200).send(ok(projected, request.correlationId))
    }
  )

  fastify.post(
    "/api/v1/admin/github/import",
    {
      preHandler: [authGuard, csrfPreHandler],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const body = request.body as { fullName?: string } | undefined
      if (body === undefined || body.fullName === undefined || body.fullName.length === 0) {
        throw new ValidationError("fullName is required")
      }
      const project = await importer.importRepo(body.fullName)
      return reply.status(201).send(ok(project, request.correlationId))
    }
  )
}

export default githubRoutes