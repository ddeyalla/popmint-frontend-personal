"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp, Paperclip, Globe } from "lucide-react"
import { useChatStore } from "@/store/chatStore"

export function ChatInput() {
  const [message, setMessage] = useState("")
  const addMessage = useChatStore((state) => state.addMessage)

  const handleSubmit = () => {
    if (!message.trim()) return

    // Add user message to chat
    addMessage({
      type: "userInput",
      content: message,
    })

    // Clear input
    setMessage("")

    // Simulate agent response
    setTimeout(() => {
      addMessage({
        type: "agentProgress",
        content: "Thinking...",
      })

      // Simulate agent output after a delay
      setTimeout(() => {
        addMessage({
          type: "agentOutput",
          content: "I'll generate some ad creatives based on your request. Let me work on that for you.",
        })
      }, 2000)
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="gap-5 p-2.5 bg-white shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c] flex flex-col items-start w-full rounded-[10px] m-2">
      <div className="gap-2 flex flex-col items-start w-full rounded-[10px]">
        <div className="font-medium text-slate-500 text-sm">Ask Popmint...</div>
      </div>

      <div className="flex items-center justify-around gap-2 w-full">
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-1 py-2 rounded-[100px]" type="button">
              <Paperclip className="w-3.5 h-3.5 text-gray-600" />
              <span className="font-medium text-gray-600 text-sm ml-1">Attach</span>
            </Button>

            <Button variant="ghost" size="sm" className="h-8 px-1 py-2 rounded-[100px]" type="button">
              <Globe className="w-3.5 h-3.5 text-gray-600" />
              <span className="font-medium text-gray-600 text-sm ml-1">Search</span>
            </Button>
          </div>

          <Button
            className="w-8 h-8 p-2 bg-[#0281f2] rounded-[100px]"
            onClick={handleSubmit}
            disabled={!message.trim()}
            type="button"
          >
            <ArrowUp className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>
    </div>
  )
}
