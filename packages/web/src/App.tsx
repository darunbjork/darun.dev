import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StatsSection } from "@/components/stats-section"
import { ProjectGrid } from "@/components/project-grid"
import { GlassCard } from "@/components/glass-card"

export function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-(--void) text-(--text)">
      <Navbar />
      <Hero />
      <StatsSection />

      <section id="projects" className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-6 text-2xl font-semibold">Projects</h2>
        <ProjectGrid />
      </section>

      <section id="about" className="mx-auto max-w-6xl px-6 pb-24">
        <GlassCard className="p-6">
          <h2 className="mb-2 text-xl font-medium">About</h2>
          <p className="text-sm text-(--muted)">
            Placeholder — deeper about copy can land with content polish.
          </p>
        </GlassCard>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-6 pb-24">
        <GlassCard className="p-6" glow="ember">
          <h2 className="mb-2 text-xl font-medium">Contact</h2>
          <p className="text-sm text-(--muted)">
            Reach out via the portfolio chat or email listed in context.
          </p>
        </GlassCard>
      </section>
    </div>
  )
}