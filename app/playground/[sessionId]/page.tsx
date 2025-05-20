"use client"

import { useEffect, useRef, useMemo } from "react"
import { CanvasArea } from "@/components/playground/canvas/canvas-area"
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel"
import { CollapsedOverlay } from "@/components/playground/collapsed-overlay"
import { useCanvasStore } from "@/store/canvasStore"
import { cn } from "@/lib/utils"

export default function PlaygroundPage() {
  const { isSidebarCollapsed } = useCanvasStore()
  const canvasAreaWrapperRef = useRef<HTMLDivElement>(null);

  // Precompute styles only when isSidebarCollapsed changes
  const canvasStyles = useMemo(() => {
    return { 
      willChange: "transform",
      transform: isSidebarCollapsed ? 'translateX(0)' : 'translateX(372px)',
      width: isSidebarCollapsed ? '100%' : 'calc(100% - 372px)'
    };
  }, [isSidebarCollapsed]);

  const containerClassName = useMemo(() => {
    return cn(
      "flex h-screen w-screen transition-all duration-300 ease-in-out", 
      isSidebarCollapsed ? "p-2" : "p-2"
    );
  }, [isSidebarCollapsed]);

  const sidebarClassName = useMemo(() => {
    return cn(
      "fixed left-0 top-0 h-full w-[372px] bg-white z-40 transition-transform duration-300 ease-in-out",
      isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
    );
  }, [isSidebarCollapsed]);

  // Remove the expensive logging and setTimeout
  useEffect(() => {
    // If we need to do something when sidebar state changes, do it more efficiently
    if (canvasAreaWrapperRef.current) {
      // Force a reflow for the canvas only once after sidebar toggling
      canvasAreaWrapperRef.current.offsetWidth; // Reading this property forces a reflow
      
      // If we need to notify any components that depend on canvas size,
      // we can dispatch a custom event instead of using timeouts
      const resizeEvent = new CustomEvent('canvas-resize', { detail: { collapsed: isSidebarCollapsed } });
      window.dispatchEvent(resizeEvent);
    }
  }, [isSidebarCollapsed]);

  return (
    <div className={containerClassName}>
      {/* Sidebar */}
      <div
        className={sidebarClassName}
        style={{ willChange: "transform" }}
      >
        <div className="relative h-full">
          <ChatPanel />
        </div>
      </div>

      {/* Main canvas area */}
      <div 
        ref={canvasAreaWrapperRef}
        className="relative min-w-0 h-full z-30 transition-transform duration-300 ease-in-out"
        style={canvasStyles}
      >
        <CanvasArea />
        <CollapsedOverlay position="left" />
      </div>
    </div>
  )
}
