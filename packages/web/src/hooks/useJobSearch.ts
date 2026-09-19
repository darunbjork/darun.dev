import { useMutation } from "@tanstack/react-query"
import { searchJobs, generatePitch, type JobSearchParams } from "@/lib/jobs-api"

export function useJobSearch() {
  return useMutation({
    mutationFn: (params: JobSearchParams) => searchJobs(params),
  })
}

export function useGeneratePitch() {
  return useMutation({
    mutationFn: (jdText: string) => generatePitch(jdText),
  })
}
