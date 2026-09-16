import type { FastifyInstance } from "fastify"
import type { AtsSource, JobWatcher } from "../../generated/prisma/client.js"
import { AppError } from "../../utils/errors.js"

export type JobWatcherDto = {
  id: string
  ats: AtsSource
  companySlug: string
  displayName: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

function toDto(w: JobWatcher): JobWatcherDto {
  return {
    id: w.id,
    ats: w.ats,
    companySlug: w.companySlug,
    displayName: w.displayName,
    enabled: w.enabled,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }
}

export class JobWatcherService {
  constructor(private readonly fastify: FastifyInstance) {}

  async list(): Promise<JobWatcherDto[]> {
    const rows = await this.fastify.prisma.jobWatcher.findMany({
      orderBy: [{ ats: "asc" }, { companySlug: "asc" }],
    })
    return rows.map(toDto)
  }

  async listEnabled(): Promise<JobWatcherDto[]> {
    const rows = await this.fastify.prisma.jobWatcher.findMany({
      where: { enabled: true },
      orderBy: [{ ats: "asc" }, { companySlug: "asc" }],
    })
    return rows.map(toDto)
  }

  async create(input: {
    ats: AtsSource
    companySlug: string
    displayName?: string
  }): Promise<JobWatcherDto> {
    const companySlug = input.companySlug.trim().toLowerCase()
    if (companySlug.length === 0) {
      throw new AppError("companySlug is required", 400, "VALIDATION_ERROR")
    }
    if (companySlug.length > 80) {
      throw new AppError("companySlug is too long", 400, "VALIDATION_ERROR")
    }

    const existing = await this.fastify.prisma.jobWatcher.findUnique({
      where: {
        ats_companySlug: { ats: input.ats, companySlug },
      },
    })
    if (existing !== null) {
      throw new AppError(
        `Watcher already exists for ${input.ats}/${companySlug}`,
        409,
        "WATCHER_EXISTS",
      )
    }

    const created = await this.fastify.prisma.jobWatcher.create({
      data: {
        ats: input.ats,
        companySlug,
        displayName: input.displayName?.trim() || null,
        enabled: true,
      },
    })
    return toDto(created)
  }

  async setEnabled(id: string, enabled: boolean): Promise<JobWatcherDto> {
    const existing = await this.fastify.prisma.jobWatcher.findUnique({
      where: { id },
    })
    if (existing === null) {
      throw new AppError("Watcher not found", 404, "WATCHER_NOT_FOUND")
    }
    const updated = await this.fastify.prisma.jobWatcher.update({
      where: { id },
      data: { enabled },
    })
    return toDto(updated)
  }

  async delete(id: string): Promise<void> {
    const existing = await this.fastify.prisma.jobWatcher.findUnique({
      where: { id },
    })
    if (existing === null) {
      throw new AppError("Watcher not found", 404, "WATCHER_NOT_FOUND")
    }
    await this.fastify.prisma.jobWatcher.delete({ where: { id } })
  }
}