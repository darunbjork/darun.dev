import type { SiteContentResponse } from "@darun/shared-types"

type Row = {
  heroEyebrow: string
  heroTitle: string
  heroAccent: string
  heroBio: string
  aboutSubtitle: string
  aboutParagraphs: string[]
  contactBlurb: string
  updatedAt: Date
}

export function siteContentRowToData(row: Row): SiteContentResponse {
  return {
    heroEyebrow: row.heroEyebrow,
    heroTitle: row.heroTitle,
    heroAccent: row.heroAccent,
    heroBio: row.heroBio,
    aboutSubtitle: row.aboutSubtitle,
    aboutParagraphs: row.aboutParagraphs,
    contactBlurb: row.contactBlurb,
    updatedAt: row.updatedAt.toISOString(),
  }
}
