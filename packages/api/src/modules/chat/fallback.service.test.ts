import { describe, it, expect } from "vitest"
import { getFallbackReply } from "./fallback.service.js"

const site = {
  aboutSubtitle: "Full-stack AI engineer · Stockholm · Open to roles",
  aboutParagraphs: [
    "Recently shipped **darun.dev**, a portfolio platform with hybrid RAG chat.",
    "Now building **LIA App** — internships in Sweden, built on the Arbetsförmedlingen API.",
  ],
}

describe("current-work fallback (site copy)", () => {
  it("answers what Darun is building from the site copy", () => {
    const out = getFallbackReply("What are you working on right now?", {
      site,
    })

    expect(out).not.toBeNull()
    expect(out?.reply).toContain("LIA App")
    expect(out?.reply).toContain("Cached answer")
    expect(out?.reply).not.toContain("**")
  })

  it("matches LIA App and Arbetsförmedlingen questions", () => {
    expect(getFallbackReply("Tell me about LIA App", { site })?.reply).toContain(
      "LIA App"
    )
    expect(
      getFallbackReply("Hur fungerar integrationen med Arbetsförmedlingen?", {
        site,
      })?.reply
    ).toContain("Arbetsförmedlingen")
  })

  it("falls through to null when no site copy exists", () => {
    expect(getFallbackReply("what are you working on", {})).toBeNull()
  })

  it("answers the 'one standout app' question without Gemini", () => {
    const out = getFallbackReply(
      "What is one App, that make Darun standout from other Developers?",
      { site }
    )

    expect(out?.reply).toContain("hybrid RAG chat")
    expect(out?.reply).toContain("Cached answer")
  })

  it("answers 'what recent app is Darun building' from the site copy", () => {
    const out = getFallbackReply(
      "What is the recent App that Darun is building?",
      { site }
    )

    expect(out?.reply).toContain("hybrid RAG chat")
    expect(out?.reply).toContain("LIA App")
    expect(out?.reply).toContain("Cached answer")
  })

  it("does not shadow availability or project answers", () => {
    expect(
      getFallbackReply("Are you available for hire?", { site })?.reply
    ).toContain("Immediately available")
  })

  it("answers 'Brief me on Darun?' from the cached profile", () => {
    const out = getFallbackReply("Brief me on Darun?", {
      profile: {
        name: "Darun Mustafa",
        title: "Full-Stack & AI Developer",
        bio: "Backend & AI engineer building production-grade systems.",
      },
    })

    expect(out?.reply).toContain("Darun Mustafa")
    expect(out?.reply).toContain("Backend & AI engineer")
    expect(out?.reply).toContain("Cached answer")
  })
})
