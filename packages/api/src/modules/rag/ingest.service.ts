import type { FastifyInstance } from "fastify"
import { chunkText } from "./chunk.js"
import { embedTexts } from "./embed.js"
import { createEmbeddingRepository } from "./embedding.repository.js"

export function createIngestService(app: FastifyInstance) {
  const prisma = app.prisma
  const repo = createEmbeddingRepository(app)

  return {
    async ingestCv(): Promise<{ source: string; deleted: number; inserted: number }> {
      const cv = await prisma.cvDocument.findFirst({
        where: { isActive: true },
        orderBy: { version: "desc" },
      })

      if (cv === null) {
        throw Object.assign(
          new Error("No active CV document. Run seed-cv first."),
          { statusCode: 404 }
        )
      }

      const source = "cv"
      const chunks = chunkText(cv.content, source, { section: "cv" })
      const vectors = await embedTexts(chunks.map((c) => c.content))
      const result = await repo.replaceSource(source, chunks, vectors)
      return { source, ...result }
    },

    async ingestProject(
      slug: string
    ): Promise<{ source: string; slug: string; ingested: number }> {
      void app
      return {
        source: "project",
        slug,
        ingested: 0,
      }
    },

    async ingestReadme(
      fullName: string
    ): Promise<{ source: string; fullName: string; ingested: number }> {
      void app
      return {
        source: "readme",
        fullName,
        ingested: 0,
      }
    },

    async ingestAll(): Promise<{
      cv: { source: string; ingested: number }
      project: { source: string; slug: string; ingested: number }[]
      readme: { source: string; fullName: string; ingested: number }[]
    }> {
      void app
      return {
        cv: { source: "cv", ingested: 0 },
        project: [],
        readme: [],
      }
    },
  }
}
