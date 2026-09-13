import type { FastifyInstance } from "fastify"
import { env } from "../../env.js"
import { chunkText } from "./chunk.js"
import { embedTexts } from "./embed.js"
import { createEmbeddingRepository } from "./embedding.repository.js"

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : []
}

function parseGithubFullName(repoUrl: string | null | undefined): string | null {
  if (repoUrl === null || repoUrl === undefined || repoUrl.length === 0) {
    return null
  }

  const clean = repoUrl.trim().replace(/\.git\/?$/i, "")

  try {
    const url = new URL(clean)
    if (url.hostname.toLowerCase() !== "github.com") return null
    const path = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "")
    return path.length > 0 ? path : null
  } catch {
    const normalized = clean.replace(/^https?:\/\/github\.com\//i, "")
    const trimmed = normalized.replace(/\/+$/, "")
    return trimmed.includes("/") ? trimmed : null
  }
}

export function createIngestService(app: FastifyInstance) {
  const prisma = app.prisma
  const repo = createEmbeddingRepository(app)

  async function ingestCv(): Promise<{ source: string; deleted: number; inserted: number }> {
    const cv = await prisma.cvDocument.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    })

    if (cv === null) {
      throw Object.assign(
        new Error("No active CV document. Run seed-cv first."),
        { statusCode: 404 }
      )
    }

    const source = "cv"
    const chunks = chunkText(cv.content, source, { section: "cv" })
    const vectors = await embedTexts(chunks.map((c) => c.content))
    const result = await repo.replaceSource(source, chunks, vectors)
    return { source, ...result }
  }

  async function ingestProject(
    slug: string
  ): Promise<{ source: string; slug: string; deleted: number; inserted: number }> {
    const project = await prisma.project.findUnique({
      where: { slug },
    })

    if (project === null) {
      throw Object.assign(new Error(`Project "${slug}" not found`), {
        statusCode: 404,
      })
    }

    const tech = asStringArray(project.techStack)

    const parts = [
      `Title: ${project.title}`,
      project.description,
      project.problem,
      project.solution,
      project.impact,
      project.learnings,
      tech.length > 0 ? `Tech: ${tech.join(", ")}` : null,
    ].filter((part): part is string => typeof part === "string" && part.trim().length > 0)

    const source = `project:${slug}`
    const chunks = chunkText(parts.join("\n\n"), source, { section: "project", slug })
    const vectors = await embedTexts(chunks.map((c) => c.content))
    const result = await repo.replaceSource(source, chunks, vectors)
    return { source, slug, ...result }
  }

  async function ingestReadme(
    fullName: string
  ): Promise<{ source: string; fullName: string; deleted: number; inserted: number }> {
    const [owner, repoName] = fullName.split("/")

    if (owner === undefined || repoName === undefined || owner.length === 0 || repoName.length === 0) {
      throw Object.assign(new Error(`Invalid GitHub full name: ${fullName}`), {
        statusCode: 400,
      })
    }

    const headers: Record<string, string> = {
      "User-Agent": "darun.dev-portfolio",
      Accept: "application/vnd.github.raw",
    }

    if (env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`
    }

    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/readme`,
      { headers }
    )

    if (!res.ok) {
      if (res.status === 404) {
        throw Object.assign(new Error(`README not found for ${fullName}`), {
          statusCode: 404,
        })
      }
      throw Object.assign(new Error(`GitHub error ${res.status} for ${fullName}`), {
        statusCode: 502,
      })
    }

    const readme = await res.text()
    if (readme.trim().length === 0) {
      throw Object.assign(new Error(`README is empty for ${fullName}`), {
        statusCode: 404,
      })
    }

    const source = `readme:${fullName}`
    const chunks = chunkText(readme, source, { section: "readme", slug: fullName })
    const vectors = await embedTexts(chunks.map((c) => c.content))
    const result = await repo.replaceSource(source, chunks, vectors)
    return { source, fullName, ...result }
  }

  async function ingestAll(): Promise<{
    cv: { source: string; deleted: number; inserted: number }
    project: { source: string; slug: string; deleted: number; inserted: number }[]
    readme: { source: string; fullName: string; deleted: number; inserted: number }[]
  }> {
    const cvResult = await ingestCv()

    const projects = await prisma.project.findMany({
      where: { published: true },
      select: { slug: true, repoUrl: true },
    })

    const projectResults: {
      source: string
      slug: string
      deleted: number
      inserted: number
    }[] = []

    for (const project of projects) {
      try {
        projectResults.push(await ingestProject(project.slug))
      } catch (err) {
        app.log.warn({ err, slug: project.slug }, "Project ingest failed, skipping")
      }
    }

    const readmeResults: {
      source: string
      fullName: string
      deleted: number
      inserted: number
    }[] = []

    for (const project of projects) {
      const fullName = parseGithubFullName(project.repoUrl)
      if (fullName === null) continue

      try {
        readmeResults.push(await ingestReadme(fullName))
      } catch (err) {
        app.log.warn({ err, fullName }, "README ingest failed, skipping")
      }
    }

    return {
      cv: cvResult,
      project: projectResults,
      readme: readmeResults,
    }
  }

  return {
    ingestCv,
    ingestProject,
    ingestReadme,
    ingestAll,
  }
}
