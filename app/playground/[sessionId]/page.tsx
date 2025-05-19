"use client"

import { CanvasArea } from "@/components/playground/canvas/canvas-area"
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel"
import { CollapsedOverlay } from "@/components/playground/collapsed-overlay"
import { useCanvasStore } from "@/store/canvasStore"
import { cn } from "@/lib/utils"

export default function PlaygroundPage() {
  const { isSidebarCollapsed } = useCanvasStore()

  return (
    <div className="flex h-screen w-screen p-2">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-[372px] bg-white z-30 transition-transform duration-300 ease-in-out",
          isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        )}
        style={{ willChange: "transform" }}
      >
        <div className="relative h-full">
          <ChatPanel />
        </div>
      </div>

      {/* Main canvas area */}
      <div 
        className={cn(
          "relative flex-1 min-w-0 h-full transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "ml-0" : "ml-[372px]"
        )}
        style={{ willChange: "margin" }}
      >
        <CanvasArea />
        <CollapsedOverlay position="left" />
      </div>
    </div>
  )
}
