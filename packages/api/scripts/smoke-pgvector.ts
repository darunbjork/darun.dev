import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "../src/env.js"

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  const id = `smoke_${Date.now()}`
  const fake = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0))
  const vectorStr = `[${fake.join(",")}]`

  await prisma.$executeRawUnsafe(
    `INSERT INTO portfolio_embeddings (id, content, source, metadata, embedding, "createdAt")
     VALUES ($1, $2, $3, $4::jsonb, $5::vector, NOW())`,
    id,
    "smoke test chunk",
    "smoke:test",
    JSON.stringify({ smoke: true }),
    vectorStr
  )

  const rows = await prisma.$queryRawUnsafe<
    { id: string; content: string; similarity: number }[]
  >(
    `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
     FROM portfolio_embeddings
     WHERE source = $2
     ORDER BY embedding <=> $1::vector
     LIMIT 3`,
    vectorStr,
    "smoke:test"
  )

  console.log("Rows:", rows)

  await prisma.$executeRawUnsafe(
    `DELETE FROM portfolio_embeddings WHERE source = $1`,
    "smoke:test"
  )

  await prisma.$disconnect()
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })