export interface StatItem {
  value: number | null
  label: string
  suffix?: string
  compute?: "publishedProjects" | "uniqueTechnologies"
}

export const stats: StatItem[] = [
  {
    value: null,
    label: "Published projects",
    compute: "publishedProjects",
  },
  {
    value: null,
    label: "Technologies across projects",
    compute: "uniqueTechnologies",
  },
  {
    value: 3,
    label: "Years building",
    suffix: "+",
  },
  {
    value: 3,
    label: "Services in production",
  },
]