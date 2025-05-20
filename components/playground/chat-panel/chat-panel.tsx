"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"
import { ChatInput } from "./chat-input"
import { useChatStore } from "@/store/chatStore"
import { ImageIcon } from "lucide-react"
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

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  // Check if there are any messages with images
  const hasImageMessages = messages.some(message => 
    message.imageUrls && message.imageUrls.length > 0
  );

  return (
    <div className="flex flex-col bg-transparent bg-white py-0 px-2 h-full">
      {/* Header */}
      <div className="flex flex-col items-start gap-1 w-full relative mb-2">
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
          <div className="flex items-center gap-1 text-neutral-400 text-xs">
            {hasImageMessages && <ImageIcon className="w-3 h-3 text-green-500" />}
            <span className="tracking-[0.06px]">Auto-saved</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden mb-2 rounded-lg">
        <ScrollArea className="h-full px-4 py-2">
          <div className="flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Enter a prompt below to generate an image with DALL-E</p>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}

            {messages.length > 0 && messages[messages.length - 1].type === "agentOutput" && (
              <div className="flex items-center gap-2 w-full mt-2 mb-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-green-600 text-xs font-medium">Complete</div>
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
