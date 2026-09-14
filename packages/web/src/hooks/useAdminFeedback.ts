import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  fetchAdminFeedback,
  setFeedbackApproved,
} from "@/lib/admin-feedback-api"

export function useAdminFeedbackList(
  status: "pending" | "approved" | "all",
  page = 1
) {
  return useQuery({
    queryKey: ["admin", "feedback", status, page],
    queryFn: () => fetchAdminFeedback({ status, page }),
  })
}

export function useSetFeedbackApproved() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      setFeedbackApproved(id, approved),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "feedback"] })
      void qc.invalidateQueries({ queryKey: ["feedback"] })
    },
  })
}