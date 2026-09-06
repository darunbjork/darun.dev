export interface StatItem {
  value: number
  label: string
  suffix?: string
}

export const stats: StatItem[] = [
  { value: 5, label: "Production Projects", suffix: "+" },
  { value: 12_000, label: "Lines of Code", suffix: "+" },
  { value: 99, label: "Lighthouse Score", suffix: "" },
  { value: 24, label: "Hours to Ship MVP", suffix: "" },
]