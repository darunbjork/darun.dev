import type { FastifyInstance } from "fastify"
import type { DashboardStats } from "@darun/shared-types"
import { getOrSet, CacheKey, TTL } from "../../utils/cache.js"

export class AnalyticsService {
  constructor(private readonly fastify: FastifyInstance) {}

  async getDashboardStats(): Promise<DashboardStats> {
    return getOrSet(
      this.fastify.redis,
      CacheKey.analytics(),
      TTL.ANALYTICS,
      () => this.computeStats()
    )
  }

  private async computeStats(): Promise<DashboardStats> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [
      totalVisitors,
      totalViews,
      totalFeedback,
      chatsToday,
      topProjects,
      recruiterSessions,
    ] = await Promise.all([
      this.fastify.prisma.visitor.count(),
      this.fastify.prisma.projectView.count(),
      this.fastify.prisma.feedback.count(),
      this.fastify.prisma.chatSession.count({
        where: { startedAt: { gte: oneDayAgo } },
      }),
      this.fastify.prisma.project.findMany({
        where: { published: true },
        select: { slug: true, title: true, views: true },
        orderBy: { views: "desc" },
        take: 5,
      }),
      this.fastify.prisma.chatSession.count({
        where: { userType: "Recruiter" },
      }),
    ])

    return {
      totalVisitors,
      totalViews,
      totalFeedback,
      chatsToday,
      activeRecruiters: recruiterSessions,
      positiveSentiment: 0,
      topProjects: topProjects.map((p) => ({
        slug: p.slug,
        title: p.title,
        views: p.views,
      })),
    }
  }
}