import { createHash } from "crypto"
import type { FastifyInstance } from "fastify"
import { NotFoundError } from "../../utils/errors.js"

export interface FingerprintInput {
  userAgent: string | undefined
  acceptLanguage: string | undefined
  ip: string
}

export class VisitorService {
  constructor(private readonly fastify: FastifyInstance) {}

  buildFingerprintHash(input: FingerprintInput): string {
    const raw = [
      input.ip,
      input.userAgent ?? "unknown",
      input.acceptLanguage ?? "unknown",
    ].join("|")

    return createHash("sha256").update(raw).digest("hex")
  }

  async getOrCreateVisitor(input: FingerprintInput): Promise<string> {
    const fingerprintHash = this.buildFingerprintHash(input)

    const visitor = await this.fastify.prisma.visitor.upsert({
      where: { fingerprintHash },
      update: { lastSeen: new Date() },
      create: {
        fingerprintHash,
        userAgent: input.userAgent ?? null,
      },
    })

    return visitor.id
  }

  async recordView(
    visitorId: string,
    projectSlug: string
  ): Promise<{ isUnique: boolean; totalViews: number }> {
    const project = await this.fastify.prisma.project.findFirst({
      where: { slug: projectSlug, published: true },
    })

    if (project === null) {
      throw new NotFoundError("Project")
    }

    const existing = await this.fastify.prisma.projectView.findUnique({
      where: {
        visitorId_projectSlug: { visitorId, projectSlug },
      },
    })

    const isUnique = existing === null

    if (isUnique) {
      await this.fastify.prisma.projectView.create({
        data: { visitorId, projectSlug },
      })

      const updated = await this.fastify.prisma.project.update({
        where: { slug: projectSlug },
        data: {
          views: { increment: 1 },
          uniqueVisitors: { increment: 1 },
        },
      })

      return { isUnique: true, totalViews: updated.views }
    }

    const updated = await this.fastify.prisma.project.update({
      where: { slug: projectSlug },
      data: { views: { increment: 1 } },
    })

    await this.fastify.prisma.projectView.update({
      where: {
        visitorId_projectSlug: { visitorId, projectSlug },
      },
      data: { viewedAt: new Date() },
    })

    return { isUnique: false, totalViews: updated.views }
  }
}