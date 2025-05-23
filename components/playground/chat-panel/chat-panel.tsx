"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { MessageRenderer } from "./MessageRenderer"
import { ChatInput } from "./chat-input"
import { useChatStore } from "@/store/chatStore"
import { CheckCircle, CircleCheck, ImageIcon, Store } from "lucide-react"
import { useSessionStore } from "@/store/sessionStore"
import { SidebarToggle } from "@/components/playground/sidebar-toggle"
import { useCanvasStore } from "@/store/canvasStore"
import Link from "next/link"
import { ProjectTitleDropdown } from "@/components/playground/project-title-dropdown"
import { generateImageFromPrompt } from '@/lib/generate-image'
import { CommandHelp } from "@/components/ui/command-help"

export function ChatPanel() {
  const messages = useChatStore((state) => state.messages)
  const addMessage = useChatStore((state) => state.addMessage)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { projectName, setProjectName } = useSessionStore()
  const { isSidebarCollapsed } = useCanvasStore()

  // Debug logging for messages
  console.log(`🔥 ChatPanel - Messages count: ${messages.length}`);
  messages.forEach((msg, index) => {
    console.log(`🔥 ChatPanel - Message ${index}: ${msg.id}, type: ${msg.type}`);
  });

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
          role: "user",
          type: initialMessage.type,
          content: initialMessage.content,
          imageUrls: initialMessage.imageUrls
        })
        
        // Clear the stored message so it's not added again
        localStorage.removeItem("popmint-initial-message")
        
        // If the initial message is a DALL-E command, trigger image generation
        const isImageRequest = initialMessage.content.trim().toLowerCase().startsWith('/image') || initialMessage.content.trim().toLowerCase().includes('generate image');
        if (isImageRequest) {
          (async () => {
            addMessage({ role: "assistant", type: "agent_progress", content: "Generating image with DALL-E..." });
            try {
              const proxiedUrl = await generateImageFromPrompt(initialMessage.content);
              // Add to canvas if not already present
              const addImage = useCanvasStore.getState().addImage;
              const objects = useCanvasStore.getState().objects;
              const imageExistsOnCanvas = (url: string) => {
                const isProxied = url.startsWith('/api/proxy-image');
                const originalUrl = isProxied 
                  ? decodeURIComponent(url.split('?url=')[1] || '')
                  : url;
                return objects.some(obj => {
                  if (!obj.src) return false;
                  const objIsProxied = obj.src.startsWith('/api/proxy-image');
                  const objOriginalUrl = objIsProxied 
                    ? decodeURIComponent(obj.src.split('?url=')[1] || '')
                    : obj.src;
                  return objOriginalUrl === originalUrl || obj.src === url;
                });
              };
              if (!imageExistsOnCanvas(proxiedUrl)) {
                addImage(proxiedUrl, 20, 20);
                addMessage({ role: "assistant", type: 'agent_output', content: 'Here is your generated image!' });
              } else {
                addMessage({ role: "assistant", type: 'agent_output', content: 'Image already exists on canvas.' });
              }
            } catch (err: any) {
              addMessage({ role: "assistant", type: 'agent_output', content: `Error: ${err.message || 'Failed to generate image'}` });
            }
          })();
        } else {
          // Add an agent response after a short delay (for demo purposes)
          setTimeout(() => {
            addMessage({ 
              role: "assistant",
              type: "agent_progress", 
              content: "Thinking about your request..." 
            })
          }, 800)
        }
      } catch (error) {
        console.error("Error parsing initial message:", error)
      }
    }
  }, [addMessage, messages.length])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      console.log('🔍 DEBUG - Scrolling to bottom of chat');
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
    <div className="flex flex-col bg-transparent py-2 px-2 h-full">
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
          <div>
            <span className="text-xs text-gray-500">Auto-saved</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden rounded-[10px]">
        <ScrollArea className="h-full px-1 py-2 overflow-x-visible">
          <div className="flex flex-col gap-3 w-full overflow-x-visible">
            {messages.length === 0 ? (
              <div className="h-[calc(100%-80px)] flex flex-col items-center justify-center gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-sm max-w-md space-y-4">
                  <div className="font-medium text-gray-900">Welcome to Popmint!</div>
                  <div className="text-gray-500">
                    <p className="mb-2">Generate professional ad concepts by entering the command below:</p>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-1">
                          <Store className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Generate product ads</div>
                          <div className="text-gray-500 text-xs">Paste a product URL to generate ads.</div>
                          <div className="text-gray-500 text-xs mt-1">Example: <span className="font-mono text-gray-600">https://example.com/product</span></div>
                          <div className="text-gray-500 text-xs mt-1 italic">AI analyzes product pages to create professional marketing visuals</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageRenderer key={message.id} message={message} />
              ))
            )}

            {messages.length > 0 && messages[messages.length - 1].type === "agent_output" && (
              <div className="flex items-center gap-2 w-full mt-2 mb-2">
                <CircleCheck className="w-4 h-4 text-green-500" />
                <div className="text-green-600 text-xs font-medium">Generation completed</div>
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
