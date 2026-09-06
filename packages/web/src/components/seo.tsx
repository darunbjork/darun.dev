import { useEffect } from "react"

export interface SeoProps {
  title: string
  description?: string
  path?: string
  noIndex?: boolean
}

const SITE = "darun.dev"
const DEFAULT_DESC =
  "Darun Mustafa — Full-Stack AI Engineer in Stockholm. Production TypeScript, Fastify, RAG, and portfolio platform."

export function Seo({
  title,
  description = DEFAULT_DESC,
  path = "/",
  noIndex = false,
}: SeoProps): null {
  useEffect(() => {
    const fullTitle = title.includes(SITE) ? title : `${title} · ${SITE}`
    document.title = fullTitle

    const ensureMeta = (name: string, content: string, property = false): void => {
      const attr = property ? "property" : "name"
      let el = document.head.querySelector<HTMLMetaElement>(
        `meta[${attr}="${name}"]`
      )
      if (el === null) {
        el = document.createElement("meta")
        el.setAttribute(attr, name)
        document.head.appendChild(el)
      }
      el.content = content
    }

    ensureMeta("description", description)
    ensureMeta("og:title", fullTitle, true)
    ensureMeta("og:description", description, true)
    ensureMeta("og:type", "website", true)
    ensureMeta("og:url", `https://darun.dev${path}`, true)
    ensureMeta(
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow"
    )

    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    if (canonical === null) {
      canonical = document.createElement("link")
      canonical.rel = "canonical"
      document.head.appendChild(canonical)
    }
    canonical.href = `https://darun.dev${path}`
  }, [title, description, path, noIndex])

  return null
}