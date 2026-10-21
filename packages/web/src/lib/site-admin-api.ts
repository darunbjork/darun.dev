import type { SiteContentData, SiteContentResponse } from "@darun/shared-types"
import { api, type ApiEnvelope } from "@/lib/api"

export async function updateSiteContent(
  input: SiteContentData
): Promise<SiteContentResponse> {
  const res = await api.put<ApiEnvelope<SiteContentResponse>>(
    "/api/v1/admin/site/content",
    input
  )
  if (!res.data.success) throw new Error(res.data.error ?? "Save failed")
  return res.data.data
}
