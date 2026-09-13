import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "../src/env.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const LOCAL_CV_PATH = path.join(__dirname, ".cv.local")

async function main(): Promise<void> {
  let raw: string
  try {
    raw = await readFile(LOCAL_CV_PATH, "utf8")
  } catch {
    console.error(
      `[seed:cv] Missing ${LOCAL_CV_PATH}\n` +
        `Create it locally with your CV in markdown. It is gitignored.`
    )
    process.exit(1)
  }

  const content = raw.trim()
  if (content.length < 50) {
    console.error("[seed:cv] CV too short — refusing to insert")
    process.exit(1)
  }

  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    // Deactivate any existing active CV
    await prisma.cvDocument.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    // Determine next version number
    const latest = await prisma.cvDocument.findFirst({
      orderBy: { version: "desc" },
      select: { version: true },
    })
    const nextVersion = (latest?.version ?? 0) + 1

    const doc = await prisma.cvDocument.create({
      data: { content, version: nextVersion, isActive: true },
    })

    console.log(
      `[seed:cv] OK — inserted version ${String(doc.version)} (${String(content.length)} chars, id: ${doc.id})`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })