import Fastify from "fastify"
import type { FastifyInstance } from "fastify"
import fastifyHelmet from "@fastify/helmet"
import fastifyCors from "@fastify/cors"
import fastifyCookie from "@fastify/cookie"
import fastifyCsrf from "@fastify/csrf-protection"
import fastifyRateLimit from "@fastify/rate-limit"
import fastifyMultipart from "@fastify/multipart"
import fastifySwagger from "@fastify/swagger"
import fastifySwaggerUi from "@fastify/swagger-ui"

import { env } from "./env.js"
import { prismaPlugin } from "./plugins/prisma.plugin.js"
import { redisPlugin } from "./plugins/redis.plugin.js"
import { correlationId } from "./middleware/correlation-id.js"
import { errorHandler } from "./middleware/error.handler.js"
import { healthRoutes } from "./modules/health/health.routes.js"
import { authRoutes } from "./modules/auth/auth.routes.js"
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js"
import { projectsRoutes } from "./modules/projects/projects.routes.js"
import { mediaRoutes } from "./modules/media/media.routes.js"
import { feedbackRoutes } from "./modules/feedback/feedback.routes.js"

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    trustProxy: true,
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      transport: env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    },
  })

  // 1. Security headers
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'"],
        styleSrc:   ["'self'", "'unsafe-inline'"],
        imgSrc:     ["'self'", "data:", "res.cloudinary.com"],
        connectSrc: ["'self'"],
        fontSrc:    ["'self'", "fonts.gstatic.com"],
        objectSrc:  ["'none'"],
        frameSrc:   ["'none'"],
        baseUri:    ["'self'"],
        formAction: ["'self'"],
      },
    },
  })

  // 2. CORS — only allowed origin
  await fastify.register(fastifyCors, {
    origin: [env.FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  })

  // 3. Cookie plugin
  await fastify.register(fastifyCookie, {
    secret: env.JWT_SECRET,
  })

  // 4. CSRF protection (works in production)
  await fastify.register(fastifyCsrf, {
    // @ts-ignore - secret is required but not in types for this version
    secret: env.JWT_SECRET,
    cookieOpts: {
      signed: true,
      httpOnly: false,
      sameSite: "strict",
      secure: env.NODE_ENV === "production",
    },
  })

  // 5-6. Infrastructure (before rate-limit)
  await fastify.register(prismaPlugin)
  await fastify.register(redisPlugin)

  // 7. Rate limiting
  await fastify.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
  })

  // 8. Multipart
  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  })

  // 9. Swagger
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: "darun.dev API",
        description: "Portfolio API — Darun Mustafa",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          cookieAuth: { type: "apiKey", in: "cookie", name: "token" },
        },
      },
    },
  })

  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/api/docs",
    uiConfig: { deepLinking: true },
  })

  // ! CSRF token endpoint (frontend fetches this to get the cookie)
  fastify.get(
    "/api/v1/csrf",
    { preHandler: [fastify.csrfProtection] },
    async (_request, reply) => {
      return reply.send({
        success: true,
        data: { message: "CSRF cookie set" },
      })
    }
  )

  // ! Global hooks
  fastify.addHook("onRequest", correlationId)
  fastify.setErrorHandler(errorHandler)

  await fastify.register(healthRoutes)
  await fastify.register(authRoutes)
  await fastify.register(analyticsRoutes)
  await fastify.register(projectsRoutes)
  await fastify.register(mediaRoutes)
  await fastify.register(feedbackRoutes)

  return fastify
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const app = await buildApp()
  await app.listen({ port: env.PORT, host: "0.0.0.0" })
  app.log.info(`Server listening on port ${env.PORT}`)
}