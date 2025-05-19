import { ChevronDown } from "lucide-react"
import { useCanvasStore } from "@/store/canvasStore"
import { useSessionStore } from "@/store/sessionStore"
import { SidebarToggle } from "./sidebar-toggle"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { ProjectTitleDropdown } from "./project-title-dropdown"

export function CollapsedOverlay({ position = "right" }: { position?: "left" | "right" }) {
  const { isSidebarCollapsed } = useCanvasStore()

  if (!isSidebarCollapsed) return null

  return (
    <div className={`absolute top-2 ${position === "left" ? "left-2" : "right-2"} flex items-center gap-2 z-50`}>
      <div className="flex items-center gap-2 bg-white rounded-full px-3 py-0 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.15),0px_0px_0.5px_0px_rgba(0,0,0,0.30)]">
        {/* Logo + Popmint */}
        <div className="flex items-center gap-1.5 px-2py-2">
          <Image 
            src="/images/popmint-logo.png" 
            alt="Popmint Logo" 
            width={24} 
            height={24}
            className="rounded"
          />
          <span className="font-semibold text-md text-zinc-950 font-sora">Popmint</span>
          <SidebarToggle />
        </div>

        {/* Divider */}
        <div className="w-[1px] h-[48px] bg-[#E6E6E6]" />

        {/* Project name + status */}
        <div className="flex items-center gap-2 px-2 py-2">
          <ProjectTitleDropdown />
          <span className="text-[12px] font-medium text-[rgba(0,0,0,0.5)] tracking-[0.5%]">Auto-saved</span>
        </div>
      </div>
    </div>
  )
} 