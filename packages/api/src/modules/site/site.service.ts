import type { FastifyInstance } from "fastify"
import type {
  SiteContentData,
  SiteContentResponse,
} from "@darun/shared-types"
import { SITE_CONTENT_DEFAULTS } from "@darun/shared-types"
import { CacheKey, TTL, getOrSet, invalidate } from "../../utils/cache.js"
import { ValidationError } from "../../utils/errors.js"
import { siteContentRowToData } from "./site.mapper.js"
import { refreshSiteContext } from "../chat/chat.service.js"

export class SiteService {
  constructor(private readonly fastify: FastifyInstance) {}

  async get(): Promise<SiteContentResponse> {
    // ! cache the serialized response (Dates → ISO strings), never the raw row
    const cached = await getOrSet(
      this.fastify.redis,
      CacheKey.siteContent(),
      TTL.SITE_CONTENT,
      async () => {
        const row = await this.fastify.prisma.siteContent.findUnique({
          where: { id: "singleton" },
        })
        return row === null ? null : siteContentRowToData(row)
      }
    )
    return cached ?? { ...SITE_CONTENT_DEFAULTS, updatedAt: null }
  }

  async update(input: SiteContentData): Promise<SiteContentResponse> {
    const clean = this.clean(input)
    if (clean.aboutParagraphs.length === 0) {
      throw new ValidationError("At least one About paragraph is required")
    }
    const row = await this.fastify.prisma.siteContent.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...clean },
      update: clean,
    })

    await invalidate(this.fastify.redis, CacheKey.siteContent())

    const response = siteContentRowToData(row)
    refreshSiteContext(response)
    return response
  }

  private clean(input: SiteContentData): SiteContentData {
    return {
      heroEyebrow: input.heroEyebrow.trim(),
      heroTitle: input.heroTitle.trim(),
      heroAccent: input.heroAccent.trim(),
      heroBio: input.heroBio.trim(),
      aboutSubtitle: input.aboutSubtitle.trim(),
      aboutParagraphs: input.aboutParagraphs
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
      contactBlurb: input.contactBlurb.trim(),
    }
  }
}
