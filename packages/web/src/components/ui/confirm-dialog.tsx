import { useEffect } from "react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element | null {
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !isPending) onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, isPending, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => {
        if (!isPending) onCancel()
      }}
    >
      <GlassCard
        elevated
        glow={destructive ? "ember" : "iris"}
        className="w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="mb-2 text-lg font-semibold text-(--text)"
        >
          {title}
        </h2>
        {description !== undefined && description.length > 0 && (
          <p className="mb-6 text-sm text-(--muted)">{description}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={
              destructive
                ? "bg-red-600 text-white hover:bg-red-500"
                : undefined
            }
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
