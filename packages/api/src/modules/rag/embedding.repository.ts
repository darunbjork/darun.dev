import type { FastifyInstance } from "fastify"
import { toVectorLiteral } from "./embed.js"
import type { TextChunk } from "./chunk.js"

export function createEmbeddingRepository(app: FastifyInstance) {
  const prisma = app.prisma

  return {
    async deleteBySource(source: string): Promise<number> {
      const result = await prisma.portfolioEmbedding.deleteMany({
        where: { source },
      })
      return result.count
    },

    async insertChunks(
      chunks: TextChunk[],
      vectors: number[][]
    ): Promise<number> {
      if (chunks.length !== vectors.length) {
        throw new Error("chunks/vectors length mismatch")
      }

      let inserted = 0
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!
        const vectorStr = toVectorLiteral(vectors[i]!)
        const id = `pe_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 9)}`

        await prisma.$executeRawUnsafe(
          `INSERT INTO portfolio_embeddings (id, content, source, metadata, embedding, "createdAt")
           VALUES ($1, $2, $3, $4::jsonb, $5::vector, NOW())`,
          id,
          chunk.content,
          chunk.source,
          JSON.stringify(chunk.metadata),
          vectorStr
        )
        inserted += 1
      }
      return inserted
    },

    async replaceSource(
      source: string,
      chunks: TextChunk[],
      vectors: number[][]
    ): Promise<{ deleted: number; inserted: number }> {
      const deleted = await this.deleteBySource(source)
      if (chunks.length === 0) {
        return { deleted, inserted: 0 }
      }
      const inserted = await this.insertChunks(chunks, vectors)
      return { deleted, inserted }
    },
  }
}

export type EmbeddingRepository = ReturnType<typeof createEmbeddingRepository>