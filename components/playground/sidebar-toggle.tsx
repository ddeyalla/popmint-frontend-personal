import { ChevronLeft, ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react"
import { useCanvasStore } from "@/store/canvasStore"
import { cn } from "@/lib/utils"

export function SidebarToggle({ className }: { className?: string }) {
  const { isSidebarCollapsed, toggleSidebar } = useCanvasStore()

  return (
    <button
      onClick={toggleSidebar}
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