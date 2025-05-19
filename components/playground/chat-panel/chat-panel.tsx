"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { useChatStore } from "@/store/chatStore"
import { CheckCircle } from "lucide-react"

export function ChatPanel() {
  const messages = useChatStore((state) => state.messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col bg-white p-1 h-full">
      {/* Header */}
      <div className="flex flex-col items-start gap-1 w-full pb-3 border-b">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-purple rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">P</span>
            </div>
            <div className="font-semibold text-zinc-950 text-lg">Popmint</div>
          </div>
        </div>

        <div className="flex items-center px-2 py-0 w-full">
          <div className="flex h-6 items-center gap-1 flex-1">
            <div className="font-medium text-[#000000e6] text-sm">the-whole-truth-ad</div>
          </div>

          <div className="font-medium text-[#00000080] text-xs tracking-[0.06px]">Auto-saved</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-3 py-4">
          <div className="flex flex-col gap-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {messages.length > 0 && messages[messages.length - 1].type === "agentOutput" && (
              <div className="flex items-center gap-2 w-full mt-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="opacity-75 font-medium text-zinc-900 text-sm">Task completed in 2 minutes</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
          <Separator className="w-full h-px my-4" />
        </ScrollArea>
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  )
}
