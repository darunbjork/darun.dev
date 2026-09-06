import { cn } from "@/lib/utils"
import type { ChatMessageItem } from "@/components/chat/chat-context"

export function ChatMessage({
  message,
}: {
  message: ChatMessageItem
}): React.JSX.Element {
  const isUser = message.role === "user"

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-(--iris) text-white"
            : "border border-(--border) bg-(--surface) text-(--text)"
        )}
      >
        <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
      </div>
    </div>
  )
}