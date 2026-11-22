// Read-only RAG inventory: chunks per source and when each was last ingested.
// Usage: pnpm --filter @darun/api rag:report  (reads DATABASE_URL from the env)
// ! Runs inside a READ ONLY transaction and prints aggregates only — no content, no secrets.
import pg from "pg"

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL is not set")
  }

  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query("BEGIN TRANSACTION READ ONLY")

    const sources = await client.query<{
      source: string
      chunks: string
      first_ingested: Date
      last_ingested: Date
      meta_ingested_at: string | null
    }>(
      `SELECT source,
              COUNT(*)::text AS chunks,
              MIN("createdAt") AS first_ingested,
              MAX("createdAt") AS last_ingested,
              MAX(metadata->>'ingestedAt') AS meta_ingested_at
         FROM portfolio_embeddings
        GROUP BY source
        ORDER BY source`
    )

    const projects = await client.query<{
      slug: string
      published: boolean
      repo_url: string | null
      live_url: string | null
      updated_at: Date
    }>(
      `SELECT slug, published, "repoUrl" AS repo_url, "liveUrl" AS live_url,
              "updatedAt" AS updated_at
         FROM projects
        ORDER BY published DESC, "order" ASC, slug ASC`
    )

    const cv = await client.query<{ version: number; updated_at: Date }>(
      `SELECT version, "updatedAt" AS updated_at
         FROM cv_documents WHERE "isActive" = true
        ORDER BY version DESC LIMIT 1`
    )

    await client.query("ROLLBACK")

    console.log(
      JSON.stringify(
        {
          embeddings: sources.rows.map((r) => ({
            source: r.source,
            chunks: Number(r.chunks),
            lastIngested: r.last_ingested.toISOString(),
            metadataIngestedAt: r.meta_ingested_at,
          })),
          projects: projects.rows.map((p) => ({
            slug: p.slug,
            published: p.published,
            repoUrl: p.repo_url,
            liveUrl: p.live_url,
            updatedAt: p.updated_at.toISOString(),
          })),
          activeCv:
            cv.rows[0] === undefined
              ? null
              : {
                  version: cv.rows[0].version,
                  updatedAt: cv.rows[0].updated_at.toISOString(),
                },
        },
        null,
        2
      )
    )
  } finally {
    await client.end()
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
