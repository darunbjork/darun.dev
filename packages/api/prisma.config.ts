import "dotenv/config"
import path from "node:path"
import { defineConfig, env } from "prisma/config"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import dotenv from "dotenv"
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})