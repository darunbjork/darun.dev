import type { FastifyInstance } from "fastify"
import { getOrSet, CacheKey, TTL } from "../../utils/cache.js"
import type {
  DashboardStats,
  SessionAnalytics,
  SentimentBucket,
} from "@darun/shared-types"
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

  async getSessionAnalytics(): Promise<SessionAnalytics> {
  return getOrSet(
    this.fastify.redis,
    CacheKey.sessionAnalytics(),
    TTL.ANALYTICS,
    () => this.computeSessionAnalytics()
  )
}

private async computeSessionAnalytics(): Promise<SessionAnalytics> {
  const [totalSessions, endedSessions, scored, byUserType] = await Promise.all([
    this.fastify.prisma.chatSession.count(),
    this.fastify.prisma.chatSession.count({
      where: { endedAt: { not: null } },
    }),
    this.fastify.prisma.chatSession.findMany({
      where: { sentimentScore: { not: null } },
      select: { sentimentScore: true },
    }),
    this.fastify.prisma.chatSession.groupBy({
      by: ["userType"],
      _count: { _all: true },
    }),
  ])

  const scores = scored
    .map((s) => s.sentimentScore)
    .filter((n): n is number => n !== null)

  const avgSentiment =
    scores.length === 0
      ? null
      : scores.reduce((a, b) => a + b, 0) / scores.length

  // Initialize distribution buckets
  const distribution: SentimentBucket[] = [
    { bucket: "negative", count: 0 },
    { bucket: "neutral", count: 0 },
    { bucket: "positive", count: 0 },
    { bucket: "unknown", count: 0 },
  ]

  // Update unknown bucket
  const unknownBucket = distribution.find((b) => b.bucket === "unknown")
  if (unknownBucket) {
    unknownBucket.count = totalSessions - scores.length
  }

  // Bucket each score safely
  for (const score of scores) {
    const bucketName =
      score < -0.2 ? "negative" : score <= 0.2 ? "neutral" : "positive"
    const bucket = distribution.find((b) => b.bucket === bucketName)
    if (bucket) {
      bucket.count += 1
    }
  }

  return {
    totalSessions,
    endedSessions,
    avgSentiment,
    sentimentDistribution: distribution,
    byUserType: byUserType.map((row) => ({
      userType: row.userType,
      count: row._count._all,
    })),
  }
}

}