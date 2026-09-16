import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchJobWatchers,
  createJobWatcher,
  setJobWatcherEnabled,
  deleteJobWatcher,
  type JobWatcher,
  type AtsSource,
} from "@/lib/job-watchers-api"

export const jobWatcherKeys = {
  all: ["job-watchers"] as const,
}

export function useJobWatchers() {
  return useQuery<JobWatcher[], Error>({
    queryKey: jobWatcherKeys.all,
    queryFn: fetchJobWatchers,
  })
}

export function useCreateJobWatcher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      ats: AtsSource
      companySlug: string
      displayName?: string
    }) => createJobWatcher(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobWatcherKeys.all })
    },
  })
}

export function useSetJobWatcherEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setJobWatcherEnabled(id, enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobWatcherKeys.all })
    },
  })
}

export function useDeleteJobWatcher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteJobWatcher(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: jobWatcherKeys.all })
    },
  })
}