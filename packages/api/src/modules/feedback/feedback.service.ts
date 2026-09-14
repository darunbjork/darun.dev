import type { FastifyInstance } from "fastify"
import type { FeedbackInput, FeedbackStats } from "@darun/shared-types"
import { sanitizeComment } from "../../utils/sanitize.js"
import {
  ValidationError,
  ConflictError,
  NotFoundError,
} from "../../utils/errors.js"
import {
  getOrSet,
  CacheKey,
  TTL,
  invalidate,
} from "../../utils/cache.js"

const MIN_COMMENT_LENGTH = 10
const RECENT_MIN_COMMENT_LENGTH = 20
const RECENT_MIN_RATING = 4

export type PublicFeedbackItem = {
  id: string
  projectSlug: string
  rating: number
  like: boolean
  comment: string
  createdAt: string
}

export type AdminFeedbackItem = {
  id: string
  projectSlug: string
  rating: number
  like: boolean
  comment: string
  approved: boolean
  createdAt: string
  updatedAt: string
}

export class FeedbackService {
  constructor(private readonly fastify: FastifyInstance) {}

  async submitFeedback(input: FeedbackInput): Promise<void> {
    if (input.rating < 1 || input.rating > 5) {
      throw new ValidationError("Rating must be between 1 and 5")
    }
    if (input.comment.trim().length < MIN_COMMENT_LENGTH) {
      throw new ValidationError(
        `Comment must be at least ${MIN_COMMENT_LENGTH} characters`
      )
    }

    const cleanComment = sanitizeComment(input.comment)

    const project = await this.fastify.prisma.project.findFirst({
      where: { slug: input.projectSlug, published: true },
    })
    if (project === null) {
      throw new NotFoundError("Project")
    }

    const visitor = await this.fastify.prisma.visitor.findUnique({
      where: { id: input.visitorId },
    })
    if (visitor === null) {
      throw new NotFoundError("Visitor")
    }

    const existing = await this.fastify.prisma.feedback.findFirst({
      where: {
        visitorId: input.visitorId,
        projectSlug: input.projectSlug,
      },
    })
    if (existing !== null) {
      throw new ConflictError(
        "You have already submitted feedback for this project"
      )
    }

    await this.fastify.prisma.$transaction(async (tx) => {
      await tx.feedback.create({
        data: {
          visitorId: input.visitorId,
          projectSlug: input.projectSlug,
          rating: input.rating,
          like: input.like,
          comment: cleanComment,
          approved: false,
          projectId: project.id,
        },
      })

      const stats = await tx.feedback.aggregate({
        where: { projectSlug: input.projectSlug },
        _avg: { rating: true },
        _count: { _all: true },
      })

      const likeCount = await tx.feedback.count({
        where: { projectSlug: input.projectSlug, like: true },
      })

      await tx.project.update({
        where: { slug: input.projectSlug },
        data: {
          likeCount,
          dislikeCount: stats._count._all - likeCount,
          averageRating: stats._avg.rating ?? 0,
        },
      })
    })

    await invalidate(
      this.fastify.redis,
      CacheKey.feedbackStats(input.projectSlug),
      CacheKey.projectDetail(input.projectSlug),
      CacheKey.projectsList()
    )
  }

  async getStats(projectSlug: string): Promise<FeedbackStats> {
    return getOrSet(
      this.fastify.redis,
      CacheKey.feedbackStats(projectSlug),
      TTL.FEEDBACK_STATS,
      () => this.computeStats(projectSlug)
    )
  }

  private async computeStats(projectSlug: string): Promise<FeedbackStats> {
    const [aggregate, likeCount, distribution] = await Promise.all([
      this.fastify.prisma.feedback.aggregate({
        where: { projectSlug },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.fastify.prisma.feedback.count({
        where: { projectSlug, like: true },
      }),
      Promise.all(
        ([1, 2, 3, 4, 5] as const).map(async (rating) => ({
          rating,
          count: await this.fastify.prisma.feedback.count({
            where: { projectSlug, rating },
          }),
        }))
      ),
    ])

    return {
      likeCount,
      dislikeCount: aggregate._count._all - likeCount,
      averageRating: aggregate._avg.rating ?? 0,
      totalCount: aggregate._count._all,
      distribution: Object.fromEntries(
        distribution.map((d) => [d.rating, d.count])
      ) as Record<1 | 2 | 3 | 4 | 5, number>,
    }
  }

  async listApprovedForProject(
    projectSlug: string,
    opts: { page: number; pageSize: number }
  ): Promise<{
    items: PublicFeedbackItem[]
    total: number
    page: number
    pageSize: number
  }> {
    const page = Math.max(1, opts.page)
    const pageSize = Math.min(50, Math.max(1, opts.pageSize))
    const skip = (page - 1) * pageSize

    const where = { projectSlug, approved: true }

    const [rows, total] = await Promise.all([
      this.fastify.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          projectSlug: true,
          rating: true,
          like: true,
          comment: true,
          createdAt: true,
        },
      }),
      this.fastify.prisma.feedback.count({ where }),
    ])

    return {
      items: rows.map((r) => ({
        id: r.id,
        projectSlug: r.projectSlug,
        rating: r.rating,
        like: r.like,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  }

  async listRecentApproved(opts: {
    limit: number
  }): Promise<PublicFeedbackItem[]> {
    const limit = Math.min(20, Math.max(1, opts.limit))

    const rows = await this.fastify.prisma.$queryRaw<
      Array<{
        id: string
        projectSlug: string
        rating: number
        like: boolean
        comment: string
        createdAt: Date
      }>
    >`
      SELECT id, "projectSlug", rating, "like", comment, "createdAt"
      FROM feedback
      WHERE approved = true
        AND rating >= ${RECENT_MIN_RATING}
        AND LENGTH(comment) >= ${RECENT_MIN_COMMENT_LENGTH}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `

    return rows.map((r) => ({
      id: r.id,
      projectSlug: r.projectSlug,
      rating: r.rating,
      like: r.like,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async listAdmin(opts: {
    status: "pending" | "approved" | "all"
    page: number
    pageSize: number
  }): Promise<{
    items: AdminFeedbackItem[]
    total: number
    page: number
    pageSize: number
  }> {
    const page = Math.max(1, opts.page)
    const pageSize = Math.min(50, Math.max(1, opts.pageSize))
    const skip = (page - 1) * pageSize

    const where =
      opts.status === "pending"
        ? { approved: false }
        : opts.status === "approved"
          ? { approved: true }
          : {}

    const [rows, total] = await Promise.all([
      this.fastify.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          projectSlug: true,
          rating: true,
          like: true,
          comment: true,
          approved: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.fastify.prisma.feedback.count({ where }),
    ])

    return {
      items: rows.map((r) => ({
        id: r.id,
        projectSlug: r.projectSlug,
        rating: r.rating,
        like: r.like,
        comment: r.comment,
        approved: r.approved,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }
  }

  async setApproved(id: string, approved: boolean): Promise<AdminFeedbackItem> {
    const existing = await this.fastify.prisma.feedback.findUnique({
      where: { id },
    })
    if (existing === null) {
      throw new NotFoundError("Feedback")
    }

    const updated = await this.fastify.prisma.feedback.update({
      where: { id },
      data: { approved },
      select: {
        id: true,
        projectSlug: true,
        rating: true,
        like: true,
        comment: true,
        approved: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await invalidate(
      this.fastify.redis,
      CacheKey.feedbackStats(updated.projectSlug),
      CacheKey.projectDetail(updated.projectSlug),
      CacheKey.projectsList()
    )

    return {
      id: updated.id,
      projectSlug: updated.projectSlug,
      rating: updated.rating,
      like: updated.like,
      comment: updated.comment,
      approved: updated.approved,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    }
  }
}