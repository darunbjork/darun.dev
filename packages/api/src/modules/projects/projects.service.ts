import type { FastifyInstance } from "fastify"
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "@darun/shared-types"
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/errors.js"
import { CacheKey, TTL, getOrSet, invalidate } from "../../utils/cache.js"

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export class ProjectsService {
  constructor(private readonly fastify: FastifyInstance) {}

  async list(): Promise<Project[]> {
    return getOrSet(
      this.fastify.redis,
      CacheKey.projectsList(),
      TTL.PROJECTS_LIST,
      async () => {
        const projects = await this.fastify.prisma.project.findMany({
          where: { published: true },
          include: { images: { orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        })
        return projects.map((p) => this.mapToPublic(p))
      }
    )
  }

  async getBySlug(slug: string): Promise<Project> {
    return getOrSet(
      this.fastify.redis,
      CacheKey.projectDetail(slug),
      TTL.PROJECT_DETAIL,
      async () => {
        const project = await this.fastify.prisma.project.findFirst({
          where: { slug, published: true },
          include: { images: { orderBy: { order: "asc" } } },
        })
        if (project === null) {
          throw new NotFoundError("Project")
        }
        return this.mapToPublic(project)
      }
    )
  }

  async listAll(): Promise<Project[]> {
    const projects = await this.fastify.prisma.project.findMany({
      include: { images: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    })
    return projects.map((p) => this.mapToPublic(p))
  }

  async create(input: CreateProjectInput): Promise<Project> {
    this.validateSlug(input.slug)

    const existing = await this.fastify.prisma.project.findUnique({
      where: { slug: input.slug },
    })
    if (existing !== null) {
      throw new ConflictError(`Project slug '${input.slug}'`)
    }

    const project = await this.fastify.prisma.project.create({
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        techStack: input.techStack ?? [],
        problem: input.problem ?? null,
        solution: input.solution ?? null,
        impact: input.impact ?? null,
        learnings: input.learnings ?? null,
        badge: input.badge ?? null,
        order: input.order ?? 0,
        featured: input.featured ?? false,
        published: input.published ?? false,
        repoUrl: input.repoUrl ?? null,
        liveUrl: input.liveUrl ?? null,
        coverUrl: input.coverUrl ?? null,
        coverPublicId: input.coverPublicId ?? null,
      },
      include: { images: true },
    })

    await this.invalidateCache(input.slug)
    return this.mapToPublic(project)
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    if (input.slug !== undefined) {
      this.validateSlug(input.slug)
    }

    const existing = await this.fastify.prisma.project.findUnique({
      where: { id },
    })
    if (existing === null) {
      throw new NotFoundError("Project")
    }

    if (input.slug !== undefined && input.slug !== existing.slug) {
      const conflict = await this.fastify.prisma.project.findUnique({
        where: { slug: input.slug },
      })
      if (conflict !== null) {
        throw new ConflictError(`Project slug '${input.slug}'`)
      }
    }

    const project = await this.fastify.prisma.project.update({
      where: { id },
      data: {
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.techStack !== undefined && { techStack: input.techStack }),
        ...(input.problem !== undefined && { problem: input.problem }),
        ...(input.solution !== undefined && { solution: input.solution }),
        ...(input.impact !== undefined && { impact: input.impact }),
        ...(input.learnings !== undefined && { learnings: input.learnings }),
        ...(input.badge !== undefined && { badge: input.badge }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.featured !== undefined && { featured: input.featured }),
        ...(input.published !== undefined && { published: input.published }),
        ...(input.repoUrl !== undefined && { repoUrl: input.repoUrl }),
        ...(input.liveUrl !== undefined && { liveUrl: input.liveUrl }),
        ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
        ...(input.coverPublicId !== undefined && {
          coverPublicId: input.coverPublicId,
        }),
      },
      include: { images: { orderBy: { order: "asc" } } },
    })

    await this.invalidateCache(existing.slug)
    if (input.slug !== undefined && input.slug !== existing.slug) {
      await this.invalidateCache(input.slug)
    }

    return this.mapToPublic(project)
  }

  async delete(id: string): Promise<void> {
    const project = await this.fastify.prisma.project.findUnique({
      where: { id },
    })
    if (project === null) {
      throw new NotFoundError("Project")
    }

    await this.fastify.prisma.project.delete({ where: { id } })
    await this.invalidateCache(project.slug)
  }

  private validateSlug(slug: string): void {
    if (!SLUG_REGEX.test(slug)) {
      throw new ValidationError(
        "Slug must be lowercase letters, numbers, and hyphens only (e.g. my-project)"
      )
    }
    if (slug.length < 2 || slug.length > 80) {
      throw new ValidationError("Slug must be between 2 and 80 characters")
    }
  }

  private async invalidateCache(slug: string): Promise<void> {
    await invalidate(
      this.fastify.redis,
      CacheKey.projectsList(),
      CacheKey.projectDetail(slug)
    )
  }

  private mapToPublic(project: {
    id: string
    slug: string
    title: string
    description: string | null
    coverUrl: string | null
    coverPublicId: string | null
    techStack: unknown
    problem: string | null
    solution: string | null
    impact: string | null
    learnings: string | null
    views: number
    uniqueVisitors: number
    likeCount: number
    dislikeCount: number
    averageRating: number
    badge: string | null
    order: number
    featured: boolean
    published: boolean
    repoUrl: string | null
    liveUrl: string | null
    createdAt: Date
    updatedAt: Date
    images?: Array<{
      id: string
      url: string
      publicId: string
      width: number | null
      height: number | null
      format: string | null
      bytes: number | null
      alt: string | null
      order: number
      createdAt: Date
    }>
  }): Project {
    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      description: project.description,
      coverUrl: project.coverUrl,
      techStack: (project.techStack as string[] | null) ?? [],
      problem: project.problem,
      solution: project.solution,
      impact: project.impact,
      learnings: project.learnings,
      views: project.views,
      uniqueVisitors: project.uniqueVisitors,
      likeCount: project.likeCount,
      dislikeCount: project.dislikeCount,
      averageRating: project.averageRating,
      badge: project.badge,
      order: project.order,
      featured: project.featured,
      published: project.published,
      repoUrl: project.repoUrl,
      liveUrl: project.liveUrl,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      images: (project.images ?? []).map((img) => ({
        id: img.id,
        url: img.url,
        publicId: img.publicId,
        width: img.width,
        height: img.height,
        format: img.format,
        bytes: img.bytes,
        alt: img.alt,
        order: img.order,
        createdAt: img.createdAt.toISOString(),
      })),
    }
  }
}