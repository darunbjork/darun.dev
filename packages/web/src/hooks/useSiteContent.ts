import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  SITE_CONTENT_DEFAULTS,
  type SiteContentData,
  type SiteContentResponse,
} from "@darun/shared-types"
import { fetchSiteContent } from "@/lib/site-content-api"
import { updateSiteContent } from "@/lib/site-admin-api"

export const siteContentKeys = {
  all: ["site-content"] as const,
}

function withDefaults(): SiteContentResponse {
  return { ...SITE_CONTENT_DEFAULTS, updatedAt: null }
}

export function useSiteContent(): SiteContentResponse {
  const q = useQuery<SiteContentResponse, Error>({
    queryKey: siteContentKeys.all,
    queryFn: fetchSiteContent,
    staleTime: 5 * 60_000,
    retry: 1,
    // ! renders the built-in copy while loading or if the API is unreachable
    placeholderData: withDefaults,
  })
  return q.data ?? withDefaults()
}

export function useUpdateSiteContent(): {
  save: (input: SiteContentData) => Promise<SiteContentResponse>
  isSaving: boolean
} {
  const qc = useQueryClient()
  const m = useMutation<SiteContentResponse, Error, SiteContentData>({
    mutationFn: updateSiteContent,
    onSuccess: async (data) => {
      qc.setQueryData(siteContentKeys.all, data)
      await qc.invalidateQueries({ queryKey: siteContentKeys.all })
    },
  })

  return {
    save: (input: SiteContentData): Promise<SiteContentResponse> =>
      m.mutateAsync(input),
    isSaving: m.isPending,
  }
}
