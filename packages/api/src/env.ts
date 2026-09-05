import { z } from "zod"
import path from "node:path"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, "../../../.env") })

const envSchema = z.object({
  NODE_ENV:  z.enum(["development", "test", "production"]).default("development"),
  PORT:      z.coerce.number().default(3000),

  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  REDIS_URL:    z.string().url().startsWith("redis://"),

  JWT_SECRET:     z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY:    z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),

  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM:    z.string().email(),

  FRONTEND_URL: z.string().url(),
  ADMIN_EMAIL:    z.string().email(),
  ADMIN_PASSWORD: z.string().min(12),

  SENTRY_DSN:          z.string().url().optional(),
  TWILIO_ACCOUNT_SID:  z.string().optional(),
  TWILIO_AUTH_TOKEN:   z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  ADMIN_PHONE_NUMBER:  z.string().optional(),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error("❌ Invalid environment variables:")
  console.error(result.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = result.data