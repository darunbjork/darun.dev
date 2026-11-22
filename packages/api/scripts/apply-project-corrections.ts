// Brings the DB `projects` rows in line with portfolio-context.json
// (ResearchBot live + 969 tests, Voxcript row, no devquiz-api live claim,
// no links to the unowned darun.dev domain). Dry run by default; pass --apply to write.
// Usage: pnpm --filter @darun/api projects:correct [-- --apply]
import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { planProjectCorrections } from "../src/modules/projects/project-corrections.js"

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL
  if (url === undefined || url.length === 0) throw new Error("DATABASE_URL is not set")
  const apply = process.argv.includes("--apply")

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  try {
    const rows = await prisma.project.findMany({
      select: {
        id: true, slug: true, title: true, description: true, problem: true,
        solution: true, impact: true, learnings: true, repoUrl: true,
        liveUrl: true, published: true,
      },
    })
    const plan = planProjectCorrections(rows)

    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...plan }, null, 2))
    if (!apply) {
      console.log("\nDry run — nothing written. Re-run with --apply to write.")
      return
    }

    await prisma.$transaction([
      ...plan.updates.map((u) => prisma.project.update({ where: { id: u.id }, data: u.data })),
      ...plan.creates.map((c) => prisma.project.create({ data: c })),
    ])
    console.log(`\nApplied ${plan.updates.length} update(s), ${plan.creates.length} create(s).`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
