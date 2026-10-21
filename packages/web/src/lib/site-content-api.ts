import type { SiteContentResponse } from "@darun/shared-types"
import { getData } from "@/lib/api"

export async function fetchSiteContent(): Promise<SiteContentResponse> {
  return getData<SiteContentResponse>("/api/v1/site/content")
}
