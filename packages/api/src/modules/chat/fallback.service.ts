import type { GeminiStructuredOutput } from "@darun/shared-types"

type ContextData = {
  faqs?: Array<{ q: string; a: string }>
  guardrails?: Record<string, string>
  site?: {
    aboutSubtitle?: string
    aboutParagraphs?: string[]
  }
  profile?: {
    name?: string
    title?: string
    bio?: string
    email?: string
    location?: string
    github?: string
    portfolio?: string
    education?: { school?: string; track?: string; note?: string }
  }
  stack?: Record<string, string[]>
  projects?: Array<{
    slug: string
    title: string
    description: string
    techStack?: string[]
    highlights?: string[]
    liveUrl?: string
  }>
  experience?: Array<{
    title: string
    company?: string
    period?: string
    highlights?: string[]
  }>
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function includesAny(normalized: string, keywords: string[]): boolean {
  return keywords.some((k) => normalized.includes(k))
}

function fallbackOutput(reply: string): GeminiStructuredOutput {
  return {
    reply: `${reply}\n\n— Cached answer (the live AI is at capacity right now).`,
    userType: "Unknown",
    notes: { summary: null, nextSteps: null, painPoints: null },
  }
}

function projectReply(
  context: ContextData,
  slug: string
): string | null {
  const project = context.projects?.find((p) => p.slug === slug)
  if (project === undefined) return null
  const highlights = (project.highlights ?? []).slice(0, 3)
  return [
    project.title,
    project.description,
    ...highlights.map((h) => `- ${h}`),
    project.techStack && project.techStack.length > 0
      ? `Tech: ${project.techStack.join(", ")}`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
}

function techBackgroundReply(context: ContextData): string {
  const stack = context.stack ?? {}
  const parts: string[] = []
  if (context.profile?.bio) parts.push(context.profile.bio)
  const stackLines = Object.entries(stack)
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => `- ${category}: ${items.join(", ")}`)
  if (stackLines.length > 0) {
    parts.push(`Core stack:\n${stackLines.join("\n")}`)
  }
  const exp = context.experience?.[0]
  if (exp) {
    parts.push(
      `${exp.title} (${exp.period ?? ""}) — ${exp.highlights?.[0] ?? ""}`.trim()
    )
  }
  return parts.join("\n\n")
}

// ! served from the DB-backed site copy (site_content) — the same About text
// ! the frontend renders, so the degraded/cached answer stays current too
function currentWorkReply(context: ContextData): string | null {
  const paragraphs = (context.site?.aboutParagraphs ?? [])
    .map((p) => p.replace(/\*\*/g, "").trim())
    .filter((p) => p.length > 0)
  if (paragraphs.length === 0) return null
  return paragraphs.join("\n\n")
}

// ! last line of defence: when no keyword branch matches, answer with a cached
// ! overview instead of 503-ing the visitor over their choice of words
function catchAllReply(context: ContextData): string {
  const profile = context.profile
  const header = `${profile?.name ?? "Darun Mustafa"} — ${
    profile?.title ?? "Full-Stack & AI Developer"
  } (${profile?.location ?? "Stockholm, Sweden"})`
  const projects = (context.projects ?? [])
    .slice(0, 3)
    .map((p) => p.title)
    .join(", ")

  return [
    header,
    profile?.bio ??
      "Full-stack AI engineer building production-grade systems with React/TypeScript, Node.js and PostgreSQL.",
    projects ? `Selected projects: ${projects}.` : null,
    "The live AI is at capacity right now, so this is a cached overview — ask about experience, projects, availability, tech stack, or contact details.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n")
}

export function getFallbackReply(
  userMessage: string,
  context: ContextData
): GeminiStructuredOutput | null {
  const normalized = normalize(userMessage)
  if (normalized.length === 0) return null

  if (
    includesAny(normalized, [
      "salary",
      "compensation",
      "pay",
      "lön",
      "högre lön",
    ])
  ) {
    return fallbackOutput(
      context.guardrails?.salary ??
        "I'd prefer to discuss compensation directly in a conversation."
    )
  }

  if (
    includesAny(normalized, ["visa", "work permit", "arbets tillstånd", "uppehållsrätt"])
  ) {
    const faq = context.faqs?.find((f) => f.q.toLowerCase().includes("visa"))
    return fallbackOutput(
      faq?.a ?? "No — I am legally authorized to work in Sweden."
    )
  }

  if (
    includesAny(normalized, ["relocation", "relocate", "move to", "flytta"])
  ) {
    const faq = context.faqs?.find((f) =>
      f.q.toLowerCase().includes("relocation")
    )
    return fallbackOutput(
      faq?.a ??
        "I am based in Stockholm and open to hybrid and remote roles across Sweden and Europe."
    )
  }

  if (
    includesAny(normalized, [
      "available",
      "availability",
      "hire",
      "hiring",
      "looking for",
      "seeking",
      "job",
      "employment",
      "start working",
      "tillgänglig",
      "anställning",
    ])
  ) {
    const faq = context.faqs?.find((f) =>
      f.q.toLowerCase().includes("available")
    )
    return fallbackOutput(
      faq?.a ??
        context.guardrails?.availability ??
        "Immediately available for full-time roles in Stockholm and remotely."
    )
  }

  if (
    includesAny(normalized, [
      "where based",
      "based in",
      "location",
      "live in",
      "from",
      "located",
      "stockholm",
      "stad",
      "ort",
    ]) &&
    includesAny(normalized, ["where", "based", "location", "live", "stockholm", "stad", "ort", "från"])
  ) {
    const faq = context.faqs?.find((f) => f.q.toLowerCase().includes("based"))
    return fallbackOutput(
      faq?.a ?? "Stockholm, Sweden. Open to on-site, hybrid, and fully remote roles."
    )
  }

  if (
    includesAny(normalized, [
      "education",
      "degree",
      "school",
      "university",
      "academy",
      "study",
      "studying",
      "certificate",
      "chas",
      "careerfoundry",
      "utbildning",
      "examen",
      "skola",
    ])
  ) {
    const faq = context.faqs?.find((f) =>
      f.q.toLowerCase().includes("degree")
    )
    return fallbackOutput(
      faq?.a ?? context.guardrails?.education ?? context.profile?.education?.note ??
        "Studying at Chas Academy, with a CareerFoundry Full-Stack Web Development Certificate."
    )
  }

  if (
    includesAny(normalized, [
      "testing",
      "test",
      "tests",
      "jest",
      "vitest",
      "coverage",
      "testning",
    ])
  ) {
    const faq = context.faqs?.find((f) => f.q.toLowerCase().includes("testing"))
    if (faq) return fallbackOutput(faq.a)
  }

  if (includesAny(normalized, ["github", "contribution", "contributions", "commits"])) {
    const note = context.profile?.education?.note
    return fallbackOutput(
      note ??
        "3,300+ GitHub contributions since Jul 2023 across live deployed systems: https://github.com/darunbjork"
    )
  }

  if (includesAny(normalized, ["contact", "email", "reach out", "reach you", "linkedin", "kontakt"])) {
    const email = context.profile?.email ?? "darunbjork@gmail.com"
    return fallbackOutput(
      `Email me at ${email}, or reach me via ${context.profile?.portfolio ?? "https://darun.dev"}.`
    )
  }

  if (includesAny(normalized, ["research assistant", "rag platform", "research platform"])) {
    const reply = projectReply(context, "research-assistant-platform")
    if (reply) return fallbackOutput(reply)
  }

  if (includesAny(normalized, ["voice agent", "voice-agent", "voice pipeline", "deepgram", "elevenlabs", "speech"])) {
    const reply = projectReply(context, "voice-agent")
    if (reply) return fallbackOutput(reply)
  }

  if (includesAny(normalized, ["smart home", "iot", "mqtt", "home automation"])) {
    const reply = projectReply(context, "smart-home-automation-api")
    if (reply) return fallbackOutput(reply)
  }

  if (includesAny(normalized, ["devquiz", "quiz"])) {
    const reply = projectReply(context, "devquiz-ai-platform")
    if (reply) return fallbackOutput(reply)
  }

  if (includesAny(normalized, ["cleannation", "clean nation", "microservices", "kafka"])) {
    const reply = projectReply(context, "cleannation")
    if (reply) return fallbackOutput(reply)
  }

  if (
    includesAny(normalized, ["darun.dev", "this site", "this portfolio", "portfolio platform"])
  ) {
    const reply = projectReply(context, "darun-dev-portfolio")
    if (reply) return fallbackOutput(reply)
  }

  if (
    includesAny(normalized, [
      "working on",
      "working right now",
      "currently building",
      "are you building",
      "what are you building",
      "building right now",
      "next project",
      "coming up",
      "lia app",
      "internship",
      "internships",
      "praktik",
      "arbetsförmedlingen",
      "standout",
      "stand out",
      "one app",
      "best app",
      "what makes",
      "makes darun",
      "differentiate",
    ])
  ) {
    const reply = currentWorkReply(context)
    if (reply) return fallbackOutput(reply)
  }

  if (
    includesAny(normalized, ["projects", "project", "portfolio", "built", "built?", "work", "apps", "applications", "case study"])
  ) {
    const titles = (context.projects ?? []).map((p) => `- ${p.title}${p.liveUrl ? ` (${p.liveUrl})` : ""}`)
    if (titles.length > 0) {
      return fallbackOutput(
        `Projects I've built end-to-end:\n${titles.join("\n")}\n\nAsk me about any of them by name.`
      )
    }
  }

  if (
    includesAny(normalized, [
      "tech background",
      "technical background",
      "tech stack",
      "stack",
      "skills",
      "technologies",
      "technology",
      "experience",
      "background",
      "strengths",
      "strongest",
      "specialize",
      "expertise",
      "backend",
      "frontend",
      "fullstack",
      "full-stack",
      "ai experience",
      "teknik",
      "erfarenhet",
      "kompetens",
      "färdigheter",
    ])
  ) {
    return fallbackOutput(techBackgroundReply(context))
  }

  if (
    includesAny(normalized, ["who is", "about", "about you", "introduce", "yourself", "bio", "background story", "vem är", "brief", "brief me", "summary", "summarize", "summarise", "rundown"])
  ) {
    const profile = context.profile
    if (profile) {
      return fallbackOutput(
        [
          `${profile.name ?? "Darun Mustafa"} — ${profile.title ?? "Full-Stack & AI Developer"} (${profile.location ?? "Stockholm, Sweden"})`,
          profile.bio,
          `GitHub: ${profile.github ?? "https://github.com/darunbjork"}`,
        ]
          .filter((line): line is string => line !== null && line !== undefined)
          .join("\n\n")
      )
    }
  }

  if (
    includesAny(normalized, ["different", "unique", "why you", "why should", "what makes"])
  ) {
    const faq = context.faqs?.find((f) =>
      f.q.toLowerCase().includes("different")
    )
    if (faq) return fallbackOutput(faq.a)
  }

  if (
    includesAny(normalized, ["hi", "hello", "hey", "hej", "tjena", "good morning", "good evening"])
  ) {
    return fallbackOutput(
      `Hi! I'm the assistant on ${context.profile?.name ?? "Darun"}'s portfolio. Ask me about experience, projects, or availability.`
    )
  }

  return fallbackOutput(catchAllReply(context))
}
