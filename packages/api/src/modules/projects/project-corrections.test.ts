import { describe, expect, it } from "vitest"
import { planProjectCorrections, repoKey, type ProjectRow } from "./project-corrections.js"

function row(overrides: Partial<ProjectRow> & Pick<ProjectRow, "slug">): ProjectRow {
  return {
    id: `id-${overrides.slug}`,
    title: overrides.slug,
    description: null,
    problem: null,
    solution: null,
    impact: null,
    learnings: null,
    repoUrl: null,
    liveUrl: null,
    published: true,
    ...overrides,
  }
}

const research = row({
  slug: "research-assistant-platform",
  repoUrl: "https://github.com/darunbjork/research-assistant-platform",
  description: "RAG platform — not shipped yet. 640+ Jest tests.",
  impact: "640+ Jest tests, 82% coverage",
  published: false,
})

describe("repoKey", () => {
  it("normalises GitHub URLs", () => {
    expect(repoKey("https://github.com/darunbjork/Voxcript.git/")).toBe("darunbjork/voxcript")
    expect(repoKey("https://example.com/x")).toBeNull()
    expect(repoKey(null)).toBeNull()
  })
})

describe("planProjectCorrections", () => {
  it("marks ResearchBot live with the 969-test impact and flags stale wording", () => {
    const plan = planProjectCorrections([research])
    const update = plan.updates.find((u) => u.slug === "research-assistant-platform")
    expect(update?.data.liveUrl).toBe("https://research.voxcript.app")
    expect(update?.data.published).toBe(true)
    expect(update?.data.impact).toContain("969 automated tests")
    expect(update?.data.impact).not.toMatch(/640/)
    expect(plan.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("research-assistant-platform.description: old '640+ tests'"),
        expect.stringContaining("research-assistant-platform.description: 'not shipped'"),
      ])
    )
  })

  it("creates a published Voxcript row when none exists", () => {
    const plan = planProjectCorrections([research])
    expect(plan.creates).toEqual([
      expect.objectContaining({
        slug: "voxcript",
        repoUrl: "https://github.com/darunbjork/voxcript",
        liveUrl: "https://cdn.voxcript.app",
        published: true,
      }),
    ])
  })

  it("updates an existing Voxcript row instead of duplicating it", () => {
    const plan = planProjectCorrections([
      row({ slug: "voxcript-subtitles", repoUrl: "https://github.com/darunbjork/voxcript", published: false }),
    ])
    expect(plan.creates).toEqual([])
    expect(plan.updates[0]?.data).toEqual({ liveUrl: "https://cdn.voxcript.app", published: true })
  })

  it("removes any live URL from devquiz-api", () => {
    const plan = planProjectCorrections([
      row({ slug: "devquiz-api", repoUrl: "https://github.com/darunbjork/devquiz-api", liveUrl: "https://devquiz-api.onrender.com" }),
    ])
    expect(plan.updates.find((u) => u.slug === "devquiz-api")?.data).toEqual({ liveUrl: null })
  })

  it("rewrites https://darun.dev links in any row", () => {
    const plan = planProjectCorrections([
      row({
        slug: "darun-dev-portfolio",
        repoUrl: "https://github.com/darunbjork/darun.dev",
        liveUrl: "https://darun.dev",
        description: "Visit https://www.darun.dev/projects. Repo: https://github.com/darunbjork/darun.dev",
      }),
    ])
    const data = plan.updates.find((u) => u.slug === "darun-dev-portfolio")?.data
    expect(data?.liveUrl).toBe("https://darun-dev.pages.dev")
    expect(data?.description).toBe(
      "Visit https://darun-dev.pages.dev/projects. Repo: https://github.com/darunbjork/darun.dev"
    )
  })

  it("plans nothing for rows that are already correct", () => {
    const first = planProjectCorrections([research])
    const fixed: ProjectRow = { ...research, ...first.updates[0]!.data, description: "Agentic RAG, live." }
    const voxcript = row({ slug: "voxcript", repoUrl: "https://github.com/darunbjork/voxcript", liveUrl: "https://cdn.voxcript.app" })
    expect(planProjectCorrections([fixed, voxcript])).toEqual({ updates: [], creates: [], warnings: [] })
  })
})
