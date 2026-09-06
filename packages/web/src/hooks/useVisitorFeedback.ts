import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api, type ApiEnvelope } from "@/lib/api"
import { ensureVisitorId } from "@/lib/visitor"
import { projectKeys } from "@/hooks/useProjects"

export interface SubmitFeedbackInput {
  slug: string
  rating: number
  like: boolean
  comment: string
}

export function useVisitorFeedback(): {
  submitFeedback: (input: SubmitFeedbackInput) => Promise<void>
  isPending: boolean
  isError: boolean
  error: Error | null
  isSuccess: boolean
  reset: () => void
} {
  const queryClient = useQueryClient()

  const mutation = useMutation<void, Error, SubmitFeedbackInput>({
    mutationFn: async (input): Promise<void> => {
      const visitorId = await ensureVisitorId()
      const res = await api.post<ApiEnvelope<{ submitted: boolean }>>(
        `/api/v1/projects/${encodeURIComponent(input.slug)}/feedback`,
        {
          visitorId,
          rating: input.rating,
          like: input.like,
          comment: input.comment,
        }
      )
      if (!res.data.success) {
        throw new Error(res.data.error ?? "Feedback failed")
      }
    },
    onSuccess: async (_data, vars): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      await queryClient.invalidateQueries({
        queryKey: projectKeys.detail(vars.slug),
      })
    },
  })

  return {
    submitFeedback: (input) => mutation.mutateAsync(input),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  }
}