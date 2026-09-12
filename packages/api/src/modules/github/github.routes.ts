import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { GithubService } from "./github.service.js"
import { ok } from "../../utils/response.js"

const githubRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const service = new GithubService(fastify)

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
}

export default githubRoutes