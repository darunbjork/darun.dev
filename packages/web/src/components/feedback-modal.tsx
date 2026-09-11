import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, ThumbsUp, ThumbsDown } from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { useVisitorFeedback } from "@/hooks/useVisitorFeedback"
import { cn } from "@/lib/utils"

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  like: z.boolean(),
  comment: z.string().trim().min(10, "Comment must be at least 10 characters"),
})

type FeedbackForm = z.infer<typeof feedbackSchema>

export function FeedbackModal({
  slug,
  title,
  onClose,
}: {
  slug: string
  title: string
  onClose: () => void
}): React.JSX.Element {
  const { submitFeedback, isPending, isError, error, isSuccess, reset } =
    useVisitorFeedback()

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 5, like: true, comment: "" },
  })

  const like = useWatch({ control, name: "like" })
  const rating = useWatch({ control, name: "rating" })

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const onSubmit = handleSubmit(async (values): Promise<void> => {
    try {
      await submitFeedback({ slug, ...values })
    } catch {
      // error surface via isError
    }
  })

  // ! Friendly copy for the "already submitted" (409) case
  const errorMessage = ((): string => {
    if (!isError) return ""
    const raw = error?.message ?? ""
    if (raw.includes("409") || raw.toLowerCase().includes("already")) {
      return "You've already submitted feedback for this project."
    }
    return raw || "Could not submit feedback"
  })()

  return (
    <div
      className="fixed inset-0 z-70 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
      onClick={onClose}
    >
      <GlassCard
        elevated
        className="relative w-full max-w-md p-6"
        onClick={(e): void => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-lg p-2 text-(--muted) hover:bg-white/5"
          aria-label="Close feedback form"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <h2
          id="feedback-title"
          className="pr-10 text-xl font-semibold text-(--text)"
        >
          Feedback
        </h2>
        <p className="mt-1 text-sm text-(--muted)">{title}</p>

        {isSuccess ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-(--iris-soft)">
              Thanks — your feedback was recorded.
            </p>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={onSubmit}>
            <div>
              <p className="mb-2 text-sm text-(--muted)">Did you like it?</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={like ? "default" : "secondary"}
                  onClick={(): void => setValue("like", true, { shouldValidate: true })}
                >
                  <ThumbsUp size={16} /> Like
                </Button>
                <Button
                  type="button"
                  variant={!like ? "default" : "secondary"}
                  onClick={(): void => setValue("like", false, { shouldValidate: true })}
                >
                  <ThumbsDown size={16} /> Dislike
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm text-(--muted)">Rating</p>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={cn(
                      "h-10 w-10 rounded-lg border font-mono text-sm transition-colors",
                      rating === n
                        ? "border-(--iris) bg-(--iris) text-white"
                        : "border-(--border) text-(--muted) hover:border-(--iris)/50"
                    )}
                    onClick={(): void =>
                      setValue("rating", n, { shouldValidate: true })
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
              {errors.rating !== undefined && (
                <p className="mt-1 text-xs text-red-400">{errors.rating.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="feedback-comment"
                className="mb-2 block text-sm text-(--muted)"
              >
                Comment (min 10 characters)
              </label>
              <textarea
                id="feedback-comment"
                rows={4}
                className="w-full resize-none rounded-xl border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris)"
                placeholder="What stood out? What could improve?"
                {...register("comment")}
              />
              {errors.comment !== undefined && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.comment.message}
                </p>
              )}
            </div>

            {isError && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending…" : "Submit feedback"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={(): void => {
                  reset()
                  onClose()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  )
}