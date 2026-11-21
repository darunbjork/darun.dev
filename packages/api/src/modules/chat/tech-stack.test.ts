import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { parseTech, toModelContext } from "./tech-stack.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const shipped = JSON.parse(
  readFileSync(join(__dirname, "portfolio-context.json"), "utf-8")
) as {
  repos: unknown
  stack: unknown
  projects: Array<{ slug: string; techStack?: string[]; highlights?: string[]; status?: string }>
}

const gh = (repo: string) => `https://github.com/darunbjork/${repo}`
const repos = {
  "voice-agent": { url: gh("voice-agent"), status: "shipped" },
  "darun.dev": { url: gh("darun.dev"), status: "shipped" },
  "smart-home-automation-api": { url: gh("smart-home-automation-api"), status: "shipped" },
  cleannation: { url: gh("cleannation"), status: "in progress" },
}
const code = (repo: string, evidence: string) => ({ repo, url: gh(repo), evidence })
const tech = (stack: unknown) => parseTech({ repos, stack })

describe("parseTech validation", () => {
  it("rejects a technology with an empty provenBy", () => {
    expect(() => tech({ backend: [{ name: "Fastify", provenBy: [] }] })).toThrow(
      /backend\.0\.provenBy/
    )
  })

  it("rejects a technology with no provenBy at all", () => {
    expect(() => tech({ backend: [{ name: "Fastify" }] })).toThrow(/provenBy/)
  })

  it("rejects a url that is not the named darunbjork repo", () => {
    expect(() =>
      tech({
        backend: [
          {
            name: "Fastify",
            provenBy: [{ ...code("voice-agent", "Fastify API"), url: "https://github.com/someone/voice-agent" }],
          },
        ],
      })
    ).toThrow(/url/)
  })

  it("rejects a repo that is not in the repos registry", () => {
    expect(() =>
      tech({ backend: [{ name: "Fastify", provenBy: [code("unknown-repo", "Fastify API")] }] })
    ).toThrow(/not in repos/)
  })

  it("requires an https liveUrl on live evidence, and none on code evidence", () => {
    const live = { ...code("voice-agent", "Vercel deployment"), type: "live" }
    expect(() => tech({ hosting: [{ name: "Vercel", provenBy: [live] }] })).toThrow(/liveUrl/)
    expect(() =>
      tech({ hosting: [{ name: "Vercel", provenBy: [{ ...live, liveUrl: "http://x.vercel.app" }] }] })
    ).toThrow(/liveUrl/)
    expect(() =>
      tech({
        backend: [{ name: "Fastify", provenBy: [{ ...code("voice-agent", "Fastify"), liveUrl: "https://x.app" }] }],
      })
    ).toThrow(/liveUrl/)
    expect(() =>
      tech({ hosting: [{ name: "Vercel", provenBy: [{ ...live, liveUrl: "https://x.vercel.app" }] }] })
    ).not.toThrow()
  })
})

describe("toModelContext", () => {
  const threeRepos = {
    backend: [
      {
        name: "Redis",
        provenBy: [
          code("darun.dev", "token budgets"),
          code("voice-agent", "redis plugin"),
          code("smart-home-automation-api", "third repo"),
        ],
      },
    ],
  }

  it("shows at most 2 proving repos per technology but keeps the full list in the data", () => {
    const data = { repos, stack: threeRepos }
    const out = toModelContext(data)
    expect((out.stack as Record<string, string[]>).backend).toEqual([
      "Redis — darun.dev: token budgets | voice-agent: redis plugin",
    ])
    expect(data.stack.backend[0]?.provenBy).toHaveLength(3)
  })

  it("renders live evidence as a live URL and labels in-progress repos", () => {
    const out = toModelContext({
      repos,
      stack: {
        hosting: [
          {
            name: "Fly.io",
            provenBy: [
              code("voice-agent", "fly.toml app config"),
              { ...code("voice-agent", "API on Fly.io"), type: "live", liveUrl: "https://a.fly.dev/health" },
            ],
          },
        ],
        backend: [{ name: "Kafka", provenBy: [code("cleannation", "kafkajs consumers")] }],
      },
    })
    const stack = out.stack as Record<string, string[]>
    expect(stack.hosting).toEqual([
      "Fly.io — voice-agent: fly.toml app config; API on Fly.io, live at https://a.fly.dev/health",
    ])
    expect(stack.backend).toEqual(["Kafka — cleannation (in progress): kafkajs consumers"])
    expect(out.repoLinks).toMatchObject({
      cleannation: "https://github.com/darunbjork/cleannation (in progress)",
      "voice-agent": "https://github.com/darunbjork/voice-agent",
    })
    expect(out.repos).toBeUndefined()
  })
})

describe("shipped portfolio-context.json", () => {
  const { stack, repos: registry } = parseTech(shipped)
  const byName = new Map(Object.values(stack).flat().map((t) => [t.name, t]))

  it("contains no technology that no repo proves", () => {
    for (const unproven of ["Zustand", "Framer Motion", "BM25 keyword search"]) {
      expect(byName.has(unproven)).toBe(false)
    }
  })

  it("proves each hosting platform with a live URL", () => {
    const liveRepos = (name: string) =>
      byName.get(name)?.provenBy.filter((p) => p.type === "live").map((p) => p.repo)
    expect(liveRepos("Render")).toEqual(["smart-home-automation-api"])
    expect(liveRepos("Cloudflare Pages")).toEqual(["darun.dev"])
    expect(liveRepos("Vercel")).toEqual(["voice-agent", "DevQuiz"])
    expect(liveRepos("Fly.io")).toEqual(["voice-agent"])
    expect(byName.get("Fly.io")?.provenBy.some((p) => p.type === "code" && p.repo === "voice-agent")).toBe(true)
  })

  it("includes the newly proven technologies", () => {
    for (const name of ["Kubernetes (k3s)", "Prometheus", "Grafana", "Playwright", "Socket.io", "Recharts", "Kafka"]) {
      expect(byName.has(name), name).toBe(true)
    }
  })

  it("marks cleannation as in progress", () => {
    expect(registry.cleannation?.status).toBe("in progress")
    expect(shipped.projects.find((p) => p.slug === "cleannation")?.status).toBe("in progress")
  })

  it("tags smart-home auth accurately and keeps the Render highlight", () => {
    const smartHome = shipped.projects.find((p) => p.slug === "smart-home-automation-api")
    expect(smartHome?.techStack).toContain("JWT + household owner/member checks")
    expect(smartHome?.techStack).not.toContain("JWT/RBAC")
    expect(smartHome?.highlights?.some((h) => h.includes("Live on Render"))).toBe(true)
  })
})
