import type { FastifyInstance, FastifyPluginAsync } from "fastify"
import { Webhooks } from "@octokit/webhooks"
import { env } from "../../env.js"
import { ok, fail } from "../../utils/response.js"
import { GithubWebhookService } from "./github-webhook.service.js"

const githubWebhookRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const service = new GithubWebhookService(fastify)

  fastify.post(
    "/api/v1/github/webhook",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const secret = env.GITHUB_WEBHOOK_SECRET
      if (!secret) {
        request.log.error("GITHUB_WEBHOOK_SECRET not configured")
        return reply
          .status(503)
          .send(fail("Webhook not configured", request.correlationId))
      }

      const signature = request.headers["x-hub-signature-256"]
      if (typeof signature !== "string" || signature.length === 0) {
        return reply
          .status(401)
          .send(fail("Missing signature", request.correlationId))
      }

      const rawBody = request.rawBody
      if (typeof rawBody !== "string" || rawBody.length === 0) {
        return reply
          .status(400)
          .send(fail("Missing raw body", request.correlationId))
      }

      const webhooks = new Webhooks({ secret })
      let valid = false
      try {
        // ! @octokit/webhooks v13: verify is async. v12 and older: sync — drop the await.
        valid = await webhooks.verify(rawBody, signature)
      } catch (err) {
        request.log.warn({ err }, "webhook verify threw")
        valid = false
      }

      if (!valid) {
        request.log.warn({
          event: "webhook_invalid_signature",
          ip: request.ip,
        })
        return reply
          .status(401)
          .send(fail("Invalid signature", request.correlationId))
      }

      const event = request.headers["x-github-event"]
      const delivery = request.headers["x-github-delivery"]

      if (event === "ping") {
        return reply
          .status(200)
          .send(ok({ pong: true }, request.correlationId))
      }

      if (event !== "push") {
        return reply.status(202).send(
          ok(
            { received: true, ignored: true, event },
            request.correlationId
          )
        )
      }

      try {
        const result = await service.handlePush(
          request.body as {
            ref?: string
            repository?: { default_branch?: string; full_name?: string }
          }
        )

        request.log.info({
          event: "github_webhook_push",
          delivery,
          ...result,
        })

        return reply.status(202).send(ok(result, request.correlationId))
      } catch (err) {
        request.log.error({ err, delivery }, "webhook ingest failed")
        return reply.status(202).send(
          ok(
            { ingested: false, reason: "ingest_error" },
            request.correlationId
          )
        )
      }
    }
  )
}

export { githubWebhookRoutes }