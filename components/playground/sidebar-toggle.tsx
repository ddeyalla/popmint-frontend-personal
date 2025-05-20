import { ChevronLeft, ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react"
import { useCanvasStore } from "@/store/canvasStore"
import { cn } from "@/lib/utils"
import { memo, useCallback } from "react"

// Create a non-memoized base component
function SidebarToggleBase({ className }: { className?: string }) {
  const { isSidebarCollapsed, toggleSidebar } = useCanvasStore()
  
  // Optimize the click handler
  const handleToggle = useCallback(() => {
    // Use requestAnimationFrame to optimize the timing of the state change
    requestAnimationFrame(() => {
      toggleSidebar()
    })
  }, [toggleSidebar])

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white hover:bg-gray-50",
        "transition-all duration-200 ease-in-out",
        className
      )}
      aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
    >
      {isSidebarCollapsed ? (
        <PanelLeft className="h-4 w-4 text-gray-700" />
      ) : (
        <PanelLeftClose className="h-4 w-4 text-gray-700" />
      )}
    </button>
  )
}

// Export a memoized version
export const SidebarToggle = memo(SidebarToggleBase) 