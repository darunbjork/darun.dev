import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StatsSection } from "@/components/stats-section"
import { ProjectGrid } from "@/components/project-grid"
import { TestimonialsSection } from "@/components/testimonials-section"
import { GlassCard } from "@/components/glass-card"
import { Seo } from "@/components/seo"
import { ChatFloatingButton } from "@/components/chat/chat-floating-button"
import { RequireAuth } from "@/components/require-auth"
import { LoginPage } from "@/pages/login"
import { AdminFeedbackPage } from "@/pages/admin-feedback"
import { AdminJobWatchersPage } from "@/pages/admin-job-watchers"
import { AdminJobsPage } from "@/pages/admin-jobs"
import { Toaster } from "sonner"
import { CvDownload } from "@/components/cv-download"

const ChatPanel = lazy(() =>
  import("@/components/chat/chat-panel").then((m) => ({ default: m.ChatPanel }))
)
const AnalyticsPage = lazy(() =>
  import("@/pages/analytics").then((m) => ({ default: m.AnalyticsPage }))
)
const ChatDashboardPage = lazy(() =>
  import("@/pages/chat-dashboard").then((m) => ({
    default: m.ChatDashboardPage,
  }))
)
const AdminProjectsPage = lazy(() =>
  import("@/pages/admin-projects").then((m) => ({
    default: m.AdminProjectsPage,
  }))
)
const AdminProjectFormPage = lazy(() =>
  import("@/pages/admin-project-form").then((m) => ({
    default: m.AdminProjectFormPage,
  }))
)

function RouteFallback(): React.JSX.Element {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-(--muted)">
      Loading…
    </div>
  )
}

function NotFoundPage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-(--void) px-4 text-center">
      <div>
        <h1 className="text-4xl font-bold text-(--text)">404</h1>
        <p className="mt-2 text-sm text-(--muted)">Page not found</p>
        <a
          href="/"
          className="mt-4 inline-block rounded-lg bg-(--iris) px-4 py-2 text-sm text-white"
        >
          Go home
        </a>
      </div>
    </div>
  )
}

function HomePage(): React.JSX.Element {
  return (
    <>
      <Seo
        title="Full-Stack AI Engineer"
        path="/"
        description="Darun Mustafa — production TypeScript, Fastify, RAG systems, Stockholm."
      />
      <Navbar />
      <main className="pb-24">
        <Hero />
        <StatsSection />
        <section id="projects" className="mx-auto max-w-6xl px-6 pb-24">
          <h2 className="mb-6 text-2xl font-semibold">Projects</h2>
          <ProjectGrid />
          <TestimonialsSection />
        </section>
        <section id="about" className="mx-auto max-w-6xl px-6 py-16">
          <GlassCard className="p-8">
            <h2 className="mb-2 text-2xl font-semibold text-(--text)">About</h2>
            <p className="mb-6 font-mono text-sm text-(--iris-soft)">
              Full-stack AI engineer · Stockholm · Open to roles
            </p>
            <div className="space-y-4 text-slate-300">
              <p>
                I build production AI systems end-to-end — from vector search pipelines
                to the auth layer that protects them. Currently shipping{" "}
                <span className="text-(--text)">darun.dev</span>, a portfolio platform
                with hybrid RAG chat, admin CMS, and self-maintaining embeddings driven
                by GitHub webhooks.
              </p>
              <p>
                Previously: full-stack work across React, Fastify, PostgreSQL, and
                Gemini AI. I care about the boring parts — CSRF, token budgets,
                idempotent migrations, webhook signature verification — because those
                are what separate a demo from something that survives contact with
                production.
              </p>
            </div>
          </GlassCard>
        </section>
        <section id="contact" className="mx-auto max-w-6xl px-6 py-16">
          <GlassCard glow="ember" className="p-8">
            <h2 className="mb-3 text-2xl font-semibold text-(--text)">Let's talk</h2>
            <p className="mb-6 max-w-2xl text-slate-300">
              Open to full-stack and AI engineering roles in Stockholm, plus selected
              contract work. Usually respond within a day.
            </p>
            <div id="cv" className="mb-6 scroll-mt-24">
              <p className="mb-3 text-sm text-slate-300">Prefer a CV first?</p>
              <CvDownload />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="mailto:darunbjork@gmail.com?subject=Hello%20from%20your%20portfolio"
                className="inline-flex items-center gap-2 rounded-full bg-(--iris) px-5 py-2.5 font-mono text-sm text-white transition hover:bg-(--iris-soft)"
              >
                darunbjork@gmail.com
              </a>
              <a
                href="https://www.linkedin.com/in/darun-mustafa"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-(--border) px-5 py-2.5 font-mono text-sm text-(--text) transition hover:border-(--iris-soft)"
              >
                LinkedIn
              </a>
              <a
                href="https://github.com/darunbjork"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-(--border) px-5 py-2.5 font-mono text-sm text-(--text) transition hover:border-(--iris-soft)"
              >
                GitHub
              </a>
            </div>
            <p className="mt-8 text-xs text-slate-300">
              Or use the chat in the bottom-right — it's a live RAG demo over my CV
              and project READMEs. Try: <em>"What has Darun shipped recently?"</em>
            </p>
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

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-(--void) text-(--text)">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* ! Redirect bare /admin to /admin/projects */}
            <Route path="/admin" element={<Navigate to="/admin/projects" replace />} />

            <Route
              path="/admin/projects"
              element={
                <RequireAuth>
                  <AdminProjectsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/projects/new"
              element={
                <RequireAuth>
                  <AdminProjectFormPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/projects/:id"
              element={
                <RequireAuth>
                  <AdminProjectFormPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <RequireAuth>
                  <AnalyticsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/chat"
              element={
                <RequireAuth>
                  <ChatDashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <RequireAuth>
                  <AdminFeedbackPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/job-watchers"
              element={
                <RequireAuth>
                  <AdminJobWatchersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/jobs"
              element={
                <RequireAuth>
                  <AdminJobsPage />
                </RequireAuth>
              }
            />

            {/* ! Catch-all 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
     <Toaster
  theme="dark"
  position="bottom-right"
  offset="88px"
  toastOptions={{
    style: {
      background: "var(--surface)",
      color: "var(--text)",
      border: "1px solid var(--border)",
    },
  }}
/>

    </BrowserRouter>
  )
}