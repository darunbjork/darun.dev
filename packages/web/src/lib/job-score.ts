export function getScoreBadgeClass(score: number): string {
  if (score >= 70) return "bg-emerald-600/20 text-emerald-300"
  if (score >= 40) return "bg-amber-500/20 text-amber-300"
  return "bg-white/5 text-(--muted)"
}
