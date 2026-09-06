import { MessageCircle, X } from "lucide-react"
import { useChat } from "@/hooks/useChat"
import { cn } from "@/lib/utils"

export function ChatFloatingButton(): React.JSX.Element {
  const { isOpen, toggle } = useChat()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? "Close chat" : "Open chat"}
      className={cn(
        "fixed bottom-6 right-6 z-90 flex h-14 w-14 items-center justify-center",
        "rounded-full bg-(--iris) text-white shadow-[0_0_30px_-4px_rgba(124,58,237,0.6)]",
        "transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--iris-soft)"
      )}
    >
      {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
    </button>
  )
}