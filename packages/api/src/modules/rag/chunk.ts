const CHUNK_SIZE = 2000
const OVERLAP = 200

export type ChunkMeta = {
  source: string
  section?: string
  slug?: string
  ingestedAt: string
}

export type TextChunk = {
  content: string
  source: string
  metadata: ChunkMeta
}

export function chunkText(
  text: string,
  source: string,
  extra?: Partial<Omit<ChunkMeta, "source" | "ingestedAt">>
): TextChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").trim()
  if (normalized.length === 0) return []

  const ingestedAt = new Date().toISOString()
  const chunks: TextChunk[] = []
  let start = 0

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE, normalized.length)
    const content = normalized.slice(start, end).trim()
    if (content.length > 0) {
      chunks.push({
        content,
        source,
        metadata: { source, ingestedAt, ...extra },
      })
    }
    if (end >= normalized.length) break
    start = Math.max(0, end - OVERLAP)
  }

  return chunks
}