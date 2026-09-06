import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StatsSection } from "@/components/stats-section"
import { ProjectGrid } from "@/components/project-grid"
import { GlassCard } from "@/components/glass-card"
import { ChatPanel } from "@/components/chat/chat-panel"
import { ChatFloatingButton } from "@/components/chat/chat-floating-button"
import { ChatDashboardPage } from "@/pages/chat-dashboard"
import { AnalyticsPage } from "@/pages/analytics"
import { Seo } from "@/components/seo"
import { AdminProjectsPage } from "@/pages/admin-projects"

function HomePage(): React.JSX.Element {
  <Seo
  title="Full-Stack AI Engineer"
  description="Darun Mustafa — production TypeScript, Fastify, RAG systems, Stockholm."
  path="/"
/>
  return (
    <>
      <Navbar />
      <main>
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
              Full-Stack AI Engineer based in Stockholm.
            </p>
          </GlassCard>
        </section>
        <section id="contact" className="mx-auto max-w-6xl px-6 pb-24">
          <GlassCard className="p-6" glow="ember">
            <h2 className="mb-2 text-xl font-medium">Contact</h2>
            <p className="text-sm text-(--muted)">
              Open the chat button to ask about projects or availability.
            </p>
          </GlassCard>
        </section>
      </main>
      <ChatFloatingButton />
      <ChatPanel />
    </>
  )
}

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-(--void) text-(--text)">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/chat" element={<ChatDashboardPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          <Route path="/admin/projects" element={<AdminProjectsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}