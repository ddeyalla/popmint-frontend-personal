"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { useChatStore } from "@/store/chatStore"
import { CheckCircle } from "lucide-react"
import { useSessionStore } from "@/store/sessionStore"
import { SidebarToggle } from "@/components/playground/sidebar-toggle"
import { useCanvasStore } from "@/store/canvasStore"
import Link from "next/link"
import { ProjectTitleDropdown } from "@/components/playground/project-title-dropdown"

export function ChatPanel() {
  const messages = useChatStore((state) => state.messages)
  const addMessage = useChatStore((state) => state.addMessage)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { projectName, setProjectName } = useSessionStore()
  const { isSidebarCollapsed } = useCanvasStore()

  // Set project name from localStorage if it exists
  useEffect(() => {
    const storedProjectName = localStorage.getItem("popmint-project-name")
    if (storedProjectName) {
      setProjectName(storedProjectName)
      // Clear it to avoid reusing on page refresh
      localStorage.removeItem("popmint-project-name")
    }
  }, [setProjectName])

  // Check for initial message from homepage
  useEffect(() => {
    const initialMessageStr = localStorage.getItem("popmint-initial-message")
    
    if (initialMessageStr && messages.length === 0) {
      try {
        const initialMessage = JSON.parse(initialMessageStr)
        // Add the initial message to the chat
        addMessage({
          type: initialMessage.type,
          content: initialMessage.content,
          imageUrls: initialMessage.imageUrls
        })
        
        // Clear the stored message so it's not added again
        localStorage.removeItem("popmint-initial-message")
        
        // Add an agent response after a short delay (for demo purposes)
        setTimeout(() => {
          addMessage({ 
            type: "agentProgress", 
            content: "Thinking about your request..." 
          })
        }, 800)
      } catch (error) {
        console.error("Error parsing initial message:", error)
      }
    }
  }, [addMessage, messages.length])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col bg-transparent bg-white py-2 px-2 h-full">
      {/* Header */}
      <div className="flex flex-col items-start gap-1 w-full relative">
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/popmint_logo.svg" alt="Popmint Logo" className="w-5 h-5" />
            <div className="font-semibold text-zinc-950 text-md">Popmint</div>
          </Link>
          <SidebarToggle />
        </div>

        <div className="flex items-center px-1 py-2 w-full">
          <div className="flex h-6 items-center gap-1 flex-1">
            <ProjectTitleDropdown />
          </div>
          <div className="font-regular text-neutral-400 text-xs tracking-[0.06px]">Auto-saved</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full rounded-[10px] px-2">
          <div className="flex flex-col gap-2">
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
        </ScrollArea>
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  )
}
