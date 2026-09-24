import { forwardRef, type HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: "iris" | "ember" | "none"
  elevated?: boolean
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = "none", elevated = false, children, ...props }, ref) => {
    const glowClass =
      glow === "iris"
        ? "shadow-[0_0_30px_-8px_rgba(124,58,237,0.45)]"
        : glow === "ember"
          ? "shadow-[0_0_30px_-8px_rgba(245,158,11,0.45)]"
          : ""

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border backdrop-blur-md",
          elevated
            ? "border-white/10 bg-(--surface)"
            : "border-(--border) bg-(--surface)",
          glowClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = "GlassCard"