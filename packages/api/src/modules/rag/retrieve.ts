import type { FastifyInstance } from "fastify"
import { embedQuery, toVectorLiteral } from "./embed.js"

export type RetrievedChunk = {
  content: string
  source: string
  similarity: number
}

export async function retrieveChunks(
  app: FastifyInstance,
  queryText: string,
  k = 5
): Promise<RetrievedChunk[]> {
  const values = await embedQuery(queryText)
  const vectorStr = toVectorLiteral(values)

  const rows = await app.prisma.$queryRawUnsafe<
    { content: string; source: string; similarity: number }[]
  >(
    `SELECT
       content,
       source,
       1 - (embedding <=> $1::vector) AS similarity
     FROM portfolio_embeddings
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    k
  )

  return rows.map((r) => ({
    content: r.content,
    source: r.source,
    similarity: Number(r.similarity),
  }))
}