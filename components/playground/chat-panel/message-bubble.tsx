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
        <div className="flex items-center gap-2">
          {message.type === "agentProgress" && <Heart className="w-4 h-4 text-red-500" />}
          <div className="font-medium text-black text-sm">Popmint</div>
          <div className="font-normal text-[#000000bf] text-sm">Just now</div>
        </div>
      )}

      {isUser ? (
        <div className="flex items-center justify-center gap-2 p-2.5 w-full bg-neutral-50 rounded-[10px]">
          <div className="font-medium text-neutral-950 text-sm">{message.content}</div>
        </div>
      ) : (
        <div className="font-medium text-[#181818cc] text-sm whitespace-pre-line">{message.content}</div>
      )}

      {message.imageUrls && message.imageUrls.length > 0 && (
        <div className="font-medium text-blue-500 text-sm">Images generated and added to canvas</div>
      )}
    </div>
  )
}
