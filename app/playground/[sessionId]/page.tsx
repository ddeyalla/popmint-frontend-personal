"use client"

import { useEffect, useState } from "react"
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel"
import { CanvasArea } from "@/components/playground/canvas/canvas-area"
import { useChatStore } from "@/store/chatStore"

export default function PlaygroundPage({ params }: { params: { sessionId: string } }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const addMessage = useChatStore((state) => state.addMessage)

  // Initialize the playground
  useEffect(() => {
    // Only run this effect once
    if (isLoaded) return

    // Set loaded state
    setIsLoaded(true)

    // Simulate initial chat messages for demo
    const initializeChat = async () => {
      // Add initial user message
      addMessage({
        type: "userInput",
        content: "Create an ad for a mango flavored protein powder highlighting its freshness",
      })

      // Add agent response with delays
      await new Promise((resolve) => setTimeout(resolve, 1000))

      addMessage({
        type: "agentProgress",
        content: "Analyzing your request...",
      })

      await new Promise((resolve) => setTimeout(resolve, 2000))

      addMessage({
        type: "agentOutput",
        content:
          "There seems to be few issues with the generated adds\n\n1. The ad creatives are not matching the brand tone\n2. The ad creatives need to be 9:16 aspect ratio for Instagram\n3. The ad creatives need to be themed around Diwali\n\nI'll go ahead fix these and make variants",
      })

      await new Promise((resolve) => setTimeout(resolve, 2000))

      addMessage({
        type: "agentOutput",
        subType: "image_generated",
        content: "Great! Now I have fixed your ads and create 5 more variants",
        imageUrls: [
          "/protein-powder-orange-mango.png",
          "/protein-powder-nutrition.png",
          "/protein-powder-sky.png",
          "/placeholder-v07yq.png",
          "/protein-powder-add-to-cart.png",
        ],
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))

      addMessage({
        type: "agentOutput",
        content:
          "What do you think about the ads? If you want to try different concept, edit or want more variants, drop your thoughts in the chat 👇",
      })
    }

    // Only initialize if there are no messages
    if (useChatStore.getState().messages.length === 0) {
      initializeChat()
    }
  }, [addMessage, isLoaded])

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="w-1/4 min-w-[300px] max-w-[372px]">
        <ChatPanel />
      </div>
      <div className="flex-1">
        <CanvasArea />
      </div>
    </div>
  )
}
