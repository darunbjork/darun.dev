import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { X, Send, Loader2 } from "lucide-react"
import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "@/components/chat/chat-message"
import { useChat } from "@/hooks/useChat"
import { cn } from "@/lib/utils"

export function ChatPanel(): React.JSX.Element | null {
  const {
    isOpen,
    close,
    messages,
    isSending,
    isStarting,
    error,
    sendMessage,
    endSession,
    isEnding,
    userType,
  } = useChat()

  const [draft, setDraft] = useState("")
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    const el = listRef.current
    if (el === null) return
    el.scrollTop = el.scrollHeight
  }, [messages, isSending, isOpen])

  if (!isOpen) {
    return null
  }

  const busy = isSending || isStarting

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    const content = draft.trim()
    if (content.length === 0 || busy) return
    setDraft("")
    await sendMessage(content)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void onSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-24 right-4 z-80 w-[min(100%-2rem,24rem)]",
        "sm:bottom-24 sm:right-6"
      )}
    >
      <GlassCard
        elevated
        glow="iris"
        className="flex h-[min(70vh,32rem)] flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-label="Portfolio chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--border) px-4 py-3">
          <div>
            <p className="text-sm font-medium text-(--text)">
              Chat with darun.dev
            </p>
            <p className="text-xs text-(--muted)">
              Context-bound assistant
              {userType !== null ? ` · ${userType}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isEnding}
              onClick={(): void => {
                void endSession()
              }}
            >
              End
            </Button>
            <button
              type="button"
              className="rounded-lg p-2 text-(--muted) hover:bg-white/5 hover:text-(--text)"
              aria-label="Close chat"
              onClick={close}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        >
          {messages.length === 0 && (
            <p className="text-sm text-(--muted)">
              Ask about projects, stack, or availability. Answers come only from
              the portfolio context — no invented experience.
            </p>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs text-(--muted)">
              <Loader2 size={14} className="animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        {/* Error */}
        {error !== null && (
          <p className="border-t border-(--border) px-4 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => {
            void onSubmit(e)
          }}
          className="border-t border-(--border) p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e): void => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
              placeholder="Ask a question…"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-(--border) bg-(--void) px-3 py-2 text-sm text-(--text) outline-none focus:border-(--iris) disabled:opacity-60"
            />
            <Button
              type="submit"
              size="default"
              disabled={busy || draft.trim().length === 0}
              aria-label="Send message"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
          <p className="mt-1 text-[10px] text-(--muted)">
            Enter to send · Shift+Enter for newline
          </p>
        </form>
      </GlassCard>
    </div>
  )
}