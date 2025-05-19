"use client"

import { useEffect } from "react"
import { CanvasArea } from "@/components/playground/canvas/canvas-area"
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel"
import { CollapsedOverlay } from "@/components/playground/collapsed-overlay"
import { useCanvasStore } from "@/store/canvasStore"
import { cn } from "@/lib/utils"

export default function PlaygroundPage() {
  const { isSidebarCollapsed } = useCanvasStore()

  // Add console log to track sidebar state changes in the page component
  useEffect(() => {
    console.log('Page component: Sidebar collapsed state changed:', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  return (
    <div 
      className={cn(
        "flex h-screen w-screen transition-all duration-300 ease-in-out", 
        isSidebarCollapsed ? "p-2" : "p-2"
      )}
    >
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-[372px] bg-white z-40 transition-transform duration-300 ease-in-out",
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
        className="relative flex-1 min-w-0 h-full z-30 transition-transform duration-300 ease-in-out"
        style={{ 
          willChange: "transform",
          transform: isSidebarCollapsed ? 'translateX(0)' : 'translateX(372px)',
          width: isSidebarCollapsed ? '100vw' : 'calc(100vw - 372px)'
        }}
      >
        <CanvasArea />
        <CollapsedOverlay position="left" />
      </div>
    </div>
  )
}
