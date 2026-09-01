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
}