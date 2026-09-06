import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { GlassCard } from "@/components/glass-card"
import { useProjects } from "./hooks/useProjects.js"
import { StatsSection } from "@/components/stats-section"

export function App(): React.JSX.Element {
  const { projects, isLoading } = useProjects()

  return (
     <div className="min-h-screen bg-(--void)] text-(--text)]">
      <Navbar />
      <Hero />
      <StatsSection />

      <section id="projects" className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-6 text-2xl font-semibold">Projects</h2>
        <GlassCard className="p-6" glow="iris">
          <p className="text-(--muted)]">
            {isLoading
              ? "Loading…"
              : `${projects?.length ?? 0} published projects (grid lands Day 49)`}
          </p>
        </GlassCard>
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 pb-24">
        <GlassCard className="p-6">
          <h2 className="mb-2 text-xl font-medium">About</h2>
          <p className="text-sm text-(--muted)]">
            Placeholder — deeper about copy can land with content polish.
          </p>
        </GlassCard>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-6 pb-24">
        <GlassCard className="p-6" glow="ember">
          <h2 className="mb-2 text-xl font-medium">Contact</h2>
          <p className="text-sm text-(--muted)]">
            Reach out via the portfolio chat (Phase 6) or email listed in context.
          </p>
        </GlassCard>
      </section>
    </div>
  )
}