import { defineConfig } from "vitest/config"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

// ! Load local test values before src/env.ts reads the root .env. dotenv never
// ! overrides, so shell/CI values win and keys set here shadow the root .env.
// ! src/__tests__/setup.ts then refuses any non-local DATABASE_URL / REDIS_URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, "../../.env.test"), quiet: true })

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
    },
    exclude: ["dist/**", "node_modules/**"],   // ! prevent picking up compiled files
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
      exclude: [
        "src/generated/**",
        "src/types/**",
        "dist/**",
        "prisma/**",
      ],
    },
    setupFiles: ["./src/__tests__/setup.ts"],
    testTimeout: 15_000,
  },
})