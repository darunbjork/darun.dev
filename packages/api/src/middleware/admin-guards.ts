import type { preHandlerHookHandler } from "fastify"
import { authGuard } from "./auth.guard.js"

export function adminMutationGuards(
  csrfProtection: preHandlerHookHandler
): preHandlerHookHandler[] {
  return [authGuard, csrfProtection]
}