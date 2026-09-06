import { useCallback, useEffect, useState } from "react"
import type { Project } from "@darun/shared-types"
import { trackProjectView } from "@/lib/visitor"

export interface ProjectAnalytics {
  views: number
  uniqueVisitors: number
  averageRating: number
  likeCount: number
  dislikeCount: number
}

export function useProjectAnalytics(project: Project | undefined): {
  analytics: ProjectAnalytics | null
  isLoading: boolean
} {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const syncFromProject = useCallback((p: Project): void => {
    setAnalytics({
      views: p.views,
      uniqueVisitors: p.uniqueVisitors,
      averageRating: p.averageRating,
      likeCount: p.likeCount,
      dislikeCount: p.dislikeCount,
    })
  }, [])

  useEffect(() => {
    if (project === undefined) {
      const raf = requestAnimationFrame(() => setIsLoading(false))
      return () => cancelAnimationFrame(raf)
    }

    let cancelled = false

    void (async (): Promise<void> => {
      try {
        await trackProjectView(project.slug)
      } catch (err: unknown) {
        console.error("Failed to track view:", err)
      } finally {
        if (!cancelled) {
          syncFromProject(project)
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [project, syncFromProject])

  return { analytics, isLoading }
}