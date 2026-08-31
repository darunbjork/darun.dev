import { defineConfig } from "vitest/config"

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