import type {
  FastifyRequest,
  FastifyReply,
  HookHandlerDoneFunction,
} from "fastify"
import jwt from "jsonwebtoken"
import { env } from "../env.js"
import type { JwtPayload } from "../modules/auth/auth.service.js"
import { UnauthorizedError } from "../utils/errors.js"

export function authGuard(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const token = request.cookies["token"]

  if (token === undefined || token === "") {
    done(new UnauthorizedError("Authentication required"))
    return
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
    request.adminId = payload.adminId
    done()
  } catch {
    reply.clearCookie("token", { path: "/" })
    done(new UnauthorizedError("Session expired — please log in again"))
  }
}