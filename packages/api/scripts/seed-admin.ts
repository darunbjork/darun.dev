import { PrismaClient } from "../src/generated/prisma/client.js"
import { PrismaPg } from "@prisma/adapter-pg"
import { hashPassword } from "../src/utils/hash.js"
import { env } from "../src/env.js"

async function seedAdmin(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    const email = env.ADMIN_EMAIL.toLowerCase().trim()
    const password = env.ADMIN_PASSWORD

    if (password.length < 12) {
      throw new Error(
        "ADMIN_PASSWORD must be at least 12 characters for a bootstrap admin."
      )
    }

    const passwordHash = await hashPassword(password)

    const admin = await prisma.admin.upsert({
      where: { email },
      update: { passwordHash }, // ! rotate hash on re-run
      create: { email, passwordHash },
    })

    console.log(`[seed:admin] OK — admin ready: ${admin.email}`)
  } finally {
    await prisma.$disconnect()
  }
}

await seedAdmin()