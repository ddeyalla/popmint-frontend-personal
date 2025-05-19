import type { ChatMessage } from "@/store/chatStore"
import { Heart } from "lucide-react"

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "userInput"

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-2 w-full`}>
      {!isUser && (
        <div className="flex items-center gap-1">
          {message.type === "agentProgress"}
          <div className="w-6 h-6 bg-brand-purple rounded-full flex items-center justify-center">
              <img src="/popmint_logo.svg" alt="Popmint Logo" className="w-4 h-4" />
            </div>
          <div className="font-medium text-black text-sm">Popmint</div>
          <div className="font-normal text-neutral-400 text-xs">Just now</div>
        </div>
      )}

      {isUser ? (
        <div className="flex items-start gap-2 px-4 py-2 bg-neutral-100 rounded-[10px] max-w-fit">
          <div className="font-medium text-neutral-800 text-sm">{message.content}</div>
        </div>
      ) : (
        <div className="font-medium px-4 py-2 rounded-[10px] bg-linear-to-b from-blue-50 to-white-50 text-neutral-800 text-sm whitespace-pre-line">{message.content}</div>
      )}

      {message.imageUrls && message.imageUrls.length > 0 && (
        <div className="font-medium text-blue-500 text-sm">Images generated and added to canvas</div>
      )}
    </div>
  )
}
