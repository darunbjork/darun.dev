import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { StatsSection } from "@/components/stats-section"
import { ProjectGrid } from "@/components/project-grid"
import { GlassCard } from "@/components/glass-card"
import { useChat } from "@/hooks/useChat"
import { ChatPanel } from "@/components/chat/chat-panel"

function ChatOpenButton(): React.JSX.Element {
  const { open, isOpen } = useChat()
  if (isOpen) return <></>
  return (
    <button
      type="button"
      className="fixed bottom-6 right-6 z-80 rounded-full bg-(--iris) px-4 py-3 text-sm text-white shadow-lg"
      onClick={open}
    >
      Chat
    </button>
  )
}

function ChatDebug(): React.JSX.Element {
  const chat = useChat()
  const isBusy = chat.isStarting || chat.isSending || chat.isEnding

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-xl border border-(--border) bg-(--surface) p-3 text-xs shadow-lg">
      <div className="space-y-1">
        <p>open: {String(chat.isOpen)} | session: {chat.sessionId ?? "none"}</p>
        <p>
          msgs: {chat.messages.length} | starting: {String(chat.isStarting)} | sending: {String(chat.isSending)} | ending: {String(chat.isEnding)}
        </p>
        {chat.userType !== null && <p className="text-(--iris-soft)">userType: {chat.userType}</p>}
        {chat.error !== null && <p className="text-red-400 font-mono text-[11px]">{chat.error}</p>}
      </div>

      {chat.messages.length > 0 && (
        <div className="mt-2 max-h-32 overflow-y-auto space-y-1 border-t border-(--border) pt-2">
          {chat.messages.map((m) => (
            <p key={m.id} className="text-[11px]">
              <span className="font-semibold text-(--iris-soft)">{m.role}: </span>
              {m.content}
            </p>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={isBusy || chat.sessionId !== null}
          onClick={() => void chat.startSession()}
          className="rounded px-2 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {chat.isStarting ? "Starting…" : "Start"}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void chat.sendMessage("What is your stack?")}
          className="rounded px-2 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {chat.isSending ? "Sending…" : "Send test"}
        </button>
        <button
          type="button"
          disabled={isBusy || chat.sessionId === null}
          onClick={() => void chat.endSession()}
          className="rounded px-2 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {chat.isEnding ? "Ending…" : "End"}
        </button>
      </div>
    </div>
  )
}

export function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-(--void) text-(--text)">
      <Navbar />
      <Hero />
      <StatsSection />
      <ChatDebug /> 
      <ChatOpenButton />
      <ChatPanel />

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