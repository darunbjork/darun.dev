import { JSDOM } from "jsdom"
import DOMPurify from "isomorphic-dompurify"

const { window } = new JSDOM("")
const purify = DOMPurify(window)

const COMMENT_CONFIG = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
  ALLOWED_ATTR: [] as string[],
  FORCE_BODY: true,
}

export function sanitizeComment(input: string): string {
  return purify.sanitize(input.trim(), COMMENT_CONFIG) as string
}

export function sanitizeChatMessage(input: string): string {
  return purify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }) as string
}