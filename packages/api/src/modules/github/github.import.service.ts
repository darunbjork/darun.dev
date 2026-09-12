import type { FastifyInstance } from "fastify"
import { AppError } from "../../utils/errors.js"
import { GithubService } from "./github.service.js"

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export class GithubImportService {
  private readonly github: GithubService

  constructor(private readonly app: FastifyInstance) {
    this.github = new GithubService(app)
  }

  listImportableRepos() {
    return this.github.getRepos({ includeForks: false, includeArchived: false })
  }

  async importRepo(fullName: string) {
    const repos = await this.github.getRepos({
      includeForks: true,
      includeArchived: true,
    })

    const repo = repos.find((r) => r.full_name === fullName)
    if (!repo) {
      throw new AppError(
        `Repository "${fullName}" not found`,
        404,
        "GITHUB_REPO_NOT_FOUND"
      )
    }

    const slugBase = slugify(repo.name) || "repo"
    let slug = slugBase
    let n = 0
    while (await this.app.prisma.project.findUnique({ where: { slug } })) {
      n += 1
      slug = `${slugBase}-${n}`
    }

    return this.app.prisma.project.create({
      data: {
        slug,
        title: repo.name,
        description: repo.description ?? null,
        repoUrl: repo.html_url,
        liveUrl: repo.homepage !== null && repo.homepage.length > 0 ? repo.homepage : null,
        techStack: [
          ...(repo.language !== null && repo.language.length > 0 ? [repo.language] : []),
          ...(Array.isArray(repo.topics) ? repo.topics : []),
        ],
        problem: null,
        solution: null,
        impact: null,
        learnings: null,
        badge: null,
        order: 0,
        featured: false,
        published: false,
      },
    })
  }
}