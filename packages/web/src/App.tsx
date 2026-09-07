import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StatsSection } from "@/components/stats-section"
import { ProjectGrid } from "@/components/project-grid"
import { GlassCard } from "@/components/glass-card"
import { Seo } from "@/components/seo"
import { ChatFloatingButton } from "@/components/chat/chat-floating-button"

const ChatPanel = lazy(() => import("@/components/chat/chat-panel").then(m => ({ default: m.ChatPanel })))
const AnalyticsPage = lazy(() => import("@/pages/analytics").then(m => ({ default: m.AnalyticsPage })))
const ChatDashboardPage = lazy(() => import("@/pages/chat-dashboard").then(m => ({ default: m.ChatDashboardPage })))
const AdminProjectsPage = lazy(() => import("@/pages/admin-projects").then(m => ({ default: m.AdminProjectsPage })))

function RouteFallback() {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm text-(--muted)">Loading…</div>
}

function HomePage() {
  return (
    <>
      <Seo title="Full-Stack AI Engineer" path="/" description="Darun Mustafa — production TypeScript, Fastify, RAG systems, Stockholm." />
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
            <p className="text-sm text-(--muted)">Full-Stack AI Engineer based in Stockholm.</p>
          </GlassCard>
        </section>
        <section id="contact" className="mx-auto max-w-6xl px-6 pb-24">
          <GlassCard className="p-6" glow="ember">
            <h2 className="mb-2 text-xl font-medium">Contact</h2>
            <p className="text-sm text-(--muted)">Open the chat button to ask about projects or availability.</p>
          </GlassCard>
        </section>
      </main>
      <ChatFloatingButton />
      <Suspense fallback={null}>
        <ChatPanel />
      </Suspense>
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-(--void) text-(--text)">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/chat" element={<ChatDashboardPage />} />
            <Route path="/admin/projects" element={<AdminProjectsPage />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}