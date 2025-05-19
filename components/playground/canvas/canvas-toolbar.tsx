"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ArrowRight,
  Type,
  Image as ImageIcon,
  Move,
  Hand,
  Scale,
  ChevronDown,
  Trash2,
} from "lucide-react"
import { useCanvasStore } from "@/store/canvasStore"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const TOOL_OPTIONS = [
  { value: "move", label: "Move", icon: Move, shortcut: "V" },
  { value: "hand", label: "Hand", icon: Hand, shortcut: "H" },
  { value: "scale", label: "Scale", icon: Scale, shortcut: "K" },
]

export function CanvasToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    undo,
    redo,
    addText,
    addImage,
    toolMode,
    setToolMode,
    selectedObjectIds,
    deleteObject,
  } = useCanvasStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const currentTool = TOOL_OPTIONS.find((t) => t.value === toolMode) || TOOL_OPTIONS[0]

  // Track the current import row
  const importRowRef = useRef(0)
  const importColRef = useRef(0)
  const IMAGES_PER_ROW = 10 // or any reasonable max per row
  const IMAGE_SPACING = 40
  const IMAGE_ROW_HEIGHT = 220 // adjust as needed for your image height

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return
      if (e.key.toLowerCase() === "v") setToolMode("move")
      if (e.key.toLowerCase() === "h") setToolMode("hand")
      if (e.key.toLowerCase() === "k") setToolMode("scale")
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setToolMode])

  // Upload image handler
  const handleUploadClick = () => fileInputRef.current?.click()
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    // Always start a new row for each import
    let col = 0
    let row = importRowRef.current
    const processFile = (idx: number) => {
      if (idx >= files.length) {
        // After import, update refs for next import (always next row)
        importColRef.current = 0
        importRowRef.current = row + 1
        e.target.value = "" // reset input
        return
      }
      const file = files[idx]
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (!ev.target) {
          processFile(idx + 1)
          return
        }
        if (typeof ev.target.result === "string") {
          // Load image to get width/height if needed
          const img = new window.Image()
          img.onload = () => {
            const x = 20 + (col * (180 + IMAGE_SPACING))
            const y = 20 + (row * IMAGE_ROW_HEIGHT)
            addImage(ev.target.result as string, x, y)
            col++
            if (col >= IMAGES_PER_ROW) {
              col = 0
              row++
            }
            processFile(idx + 1)
          }
          img.onerror = () => {
            processFile(idx + 1)
          }
          if (ev.target) {
            img.src = ev.target.result as string
          }
        } else {
          processFile(idx + 1)
        }
      }
      reader.readAsDataURL(file)
    }
    processFile(0)
  }

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c] flex items-center p-1.5 border z-50">
        {/* Cursor Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-16 rounded-full hover:bg-gray-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600"
            onClick={() => setDropdownOpen((open) => !open)}
            aria-label="Select Tool"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            {currentTool.icon && <currentTool.icon className="h-5 w-5 text-gray-700" />}
            <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
          </Button>
          {dropdownOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-4 w-40 bg-white border border-gray-200 rounded-3xl shadow-[0px_1px_2px_#00000026,0px_0px_0.5px_#0000004c] z-50 animate-fade-in">
              <ul className="p-1" role="listbox" aria-label="Tool selection">
                {TOOL_OPTIONS.map((tool) => (
                  <li key={tool.value} role="option" aria-selected={toolMode === tool.value}>
                    <button
                      className={cn(
                        "flex items-center w-full px-2 py-2 text-sm transition-colors duration-100 rounded-4xl",
                        toolMode === tool.value
                          ? "bg-blue-100 text-blue-500 font-medium"
                          : "hover:bg-blue-50 focus:bg-gray-100 text-gray-700"
                      )}
                      onClick={() => {
                        setToolMode(tool.value as 'move'|'hand'|'scale')
                        setDropdownOpen(false)
                      }}
                      tabIndex={0}
                    >
                      <tool.icon className="h-4 w-4 mr-2" />
                      {tool.label}
                      <span className="ml-auto text-xs text-gray-400">{tool.shortcut}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-gray-200 mx-2" />
        {/* Upload Image */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-gray-100"
              onClick={handleUploadClick}
              aria-label="Upload Image"
            >
              <ImageIcon className="h-5 w-5 text-gray-700" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                multiple
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload Image</p>
          </TooltipContent>
        </Tooltip>
        {/* Text Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-gray-100"
              onClick={() => addText("Text")}
              aria-label="Add Text"
            >
              <Type className="h-5 w-5 text-gray-700" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Text</p>
          </TooltipContent>
        </Tooltip>
        <div className="w-px h-6 bg-gray-200 mx-2" />
        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} className="h-9 w-9 rounded-full hover:bg-gray-100" aria-label="Undo">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} className="h-9 w-9 rounded-full hover:bg-gray-100" aria-label="Redo">
              <ArrowRight className="h-5 w-5 text-gray-700" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>
        {selectedObjectIds.length > 0 && (
          <>
            <div className="w-px h-6 bg-gray-200 mx-2" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteObject(selectedObjectIds)}
                  className="h-9 w-9 rounded-full hover:bg-red-100 text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Selected (Delete)</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
