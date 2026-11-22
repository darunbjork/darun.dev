import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { parseTech } from "./tech-stack.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGES = join(__dirname, "../../../..")

type Project = { slug: string; repoUrl: string; liveUrl: string; highlights: string[]; description: string }
const context = JSON.parse(readFileSync(join(__dirname, "portfolio-context.json"), "utf-8")) as {
  lastUpdated: string
  profile: { portfolio: string }
  projects: Project[]
  faqs: { q: string; a: string }[]
  [key: string]: unknown
}
const raw = JSON.stringify(context)
const bySlug = (slug: string) => context.projects.find((p) => p.slug === slug)

// https://darun.dev or https://www.darun.dev — not darun-dev.pages.dev, not github.com/darunbjork/darun.dev
const UNOWNED = /https?:\/\/(www\.)?darun\.dev(?![\w-]|\.[a-z])/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (["node_modules", "dist", "generated", ".turbo"].includes(name)) return []
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|json|txt|html|md)$/.test(name) && !name.endsWith(".test.ts") ? [path] : []
  })
}

describe("portfolio URL", () => {
  it("is https://darun-dev.pages.dev in the chat context", () => {
    expect(context.profile.portfolio).toBe("https://darun-dev.pages.dev")
    expect(bySlug("darun-dev-portfolio")?.liveUrl).toBe("https://darun-dev.pages.dev")
  })

  it("never links https://darun.dev anywhere in api, web or shared source", () => {
    const offenders = ["api/src", "api/scripts", "web/src", "web/public", "web/index.html", "shared-types/src"]
      .map((p) => join(PACKAGES, p))
      .flatMap((p) => (statSync(p).isDirectory() ? sourceFiles(p) : [p]))
      .filter((file) => UNOWNED.test(readFileSync(file, "utf-8")))
      .map((file) => relative(PACKAGES, file))
    expect(offenders).toEqual([])
  })

  it("matches the unowned domain but not the real one or the repo name", () => {
    expect(UNOWNED.test("see https://darun.dev.")).toBe(true)
    expect(UNOWNED.test("https://www.darun.dev/x")).toBe(true)
    expect(UNOWNED.test("https://darun-dev.pages.dev")).toBe(false)
    expect(UNOWNED.test("https://github.com/darunbjork/darun.dev")).toBe(false)
  })
})

describe("ResearchBot", () => {
  const research = bySlug("research-assistant-platform")

  it("is live at https://research.voxcript.app", () => {
    expect(research?.liveUrl).toBe("https://research.voxcript.app")
    expect(research?.description).toMatch(/live in production/i)
  })

  it("claims 969 tests and no stale 640+ figure anywhere", () => {
    expect(research?.highlights.some((h) => h.includes("969 automated tests"))).toBe(true)
    expect(raw).not.toMatch(/640\+?/)
  })
})

describe("Voxcript", () => {
  it("is a shipped project with its repo and live URL", () => {
    const voxcript = bySlug("voxcript")
    expect(voxcript?.repoUrl).toBe("https://github.com/darunbjork/voxcript")
    expect(voxcript?.liveUrl).toBe("https://cdn.voxcript.app")
    const { repos } = parseTech(context)
    expect(repos.voxcript?.status).toBe("shipped")
  })

  it("has live k3s evidence for both cluster deployments", () => {
    const { stack } = parseTech(context)
    const k3s = Object.values(stack).flat().find((t) => t.name === "Kubernetes (k3s)")
    const live = k3s?.provenBy.filter((p) => p.type === "live").map((p) => [p.repo, p.liveUrl])
    expect(live).toEqual([
      ["research-assistant-platform", "https://research.voxcript.app"],
      ["voxcript", "https://cdn.voxcript.app"],
    ])
  })
})

describe("devquiz-api", () => {
  it("makes no live claim", () => {
    const { stack } = parseTech(context)
    const liveProofs = Object.values(stack)
      .flat()
      .flatMap((t) => t.provenBy)
      .filter((p) => p.repo === "devquiz-api" && p.type === "live")
    expect(liveProofs).toEqual([])
    for (const p of context.projects.filter((p) => p.repoUrl.endsWith("/devquiz-api"))) {
      expect(p.liveUrl, p.slug).toBe("")
    }
  })
})
