"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowUp, Paperclip, Globe } from "lucide-react"
import { useChatStore } from "@/store/chatStore"
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search"

export function ChatInput() {
  const [message, setMessage] = useState("")
  const addMessage = useChatStore((state) => state.addMessage)

  const handleSubmit = (value: string, withSearch: boolean) => {
    if (!value.trim()) return
    addMessage({ type: "userInput", content: value })
    setMessage("")
    setTimeout(() => {
      addMessage({ type: "agentProgress", content: "Thinking..." })
      setTimeout(() => {
        addMessage({
          type: "agentOutput",
          content: "I'll generate some ad creatives based on your request. Let me work on that for you.",
        })
      }, 2000)
    }, 500)
  }

  return (
    <AIInputWithSearch
      placeholder="Ask Popmint..."
      onSubmit={handleSubmit}
      className="shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c] bg-white rounded-[10px]"
    />
  )
}
