"use client"

import { useEffect, useRef, useState } from "react"
import { Stage, Layer } from "react-konva"
import { KonvaImage } from "./konva-image"
import { KonvaText } from "./konva-text"
import { useCanvasStore } from "@/store/canvasStore"
import { useChatStore } from "@/store/chatStore"
import { ZoomIn, ZoomOut, Maximize, Layout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CanvasToolbar } from "./canvas-toolbar" // Import CanvasToolbar

export function CanvasArea() {
  const {
    objects,
    zoomLevel,
    selectObject,
    setZoomLevel,
    stageOffset,
    setStageOffset,
    updateStageOffset,
    selectedObjectIds,
    deleteObject,
    selectAllObjects,
    clearSelection,
  } = useCanvasStore()
  const messages = useChatStore((state) => state.messages)
  const stageRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number } | null>(null)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const [touchPan, setTouchPan] = useState(false)

  // Handle stage resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth || 800,
          height: containerRef.current.offsetHeight || 600,
        })
      }
    }

    // Initial size update
    updateSize()

    // Add resize listener
    window.addEventListener("resize", updateSize)

    return () => {
      window.removeEventListener("resize", updateSize)
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A: select all image frames
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault()
        selectAllObjects()
        return
      }
      // Cmd/Ctrl + Plus/Minus: zoom in/out
      if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault()
        setZoomLevel(Math.min(2, zoomLevel + 0.25))
        return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "-" || e.key === "_")) {
        e.preventDefault()
        setZoomLevel(Math.max(0.25, zoomLevel - 0.25))
        return
      }
      // Delete: delete all selected
      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement === document.body) {
        if (selectedObjectIds.length > 0) {
          deleteObject(selectedObjectIds)
        }
        return
      }
      // Undo/Redo (existing)
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault()
        useCanvasStore.getState().undo()
        return
      }
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key === "z") || e.key === "y")) {
        e.preventDefault()
        useCanvasStore.getState().redo()
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [zoomLevel, selectedObjectIds, setZoomLevel, deleteObject, selectAllObjects])

  // Process image messages from chat
  useEffect(() => {
    const imageMessages = messages.filter(
      (msg) =>
        msg.type === "agentOutput" && msg.subType === "image_generated" && msg.imageUrls && msg.imageUrls.length > 0,
    )

    // Get the latest image message
    const latestMessage = imageMessages[imageMessages.length - 1]

    if (latestMessage && latestMessage.imageUrls) {
      // Add images to canvas with spacing
      latestMessage.imageUrls.forEach((url, index) => {
        const addImage = useCanvasStore.getState().addImage
        addImage(url, 20 + index * 420, 20)
      })
    }
  }, [messages])

  // For demo purposes, add sample images if canvas is empty
  useEffect(() => {
    if (!isInitialized && objects.length === 0) {
      setIsInitialized(true)

      // Sample product images
      const sampleImages = [
        "/protein-powder-orange-mango.png",
        "/protein-powder-nutrition.png",
        "/protein-powder-sky.png",
        "/placeholder-v07yq.png",
        "/protein-powder-add-to-cart.png",
      ]

      // Add sample images with spacing
      sampleImages.forEach((url, index) => {
        setTimeout(() => {
          const addImage = useCanvasStore.getState().addImage
          addImage(url, 20 + index * 420, 20)
        }, index * 100) // Stagger the additions to avoid overwhelming the renderer
      })
    }
  }, [objects.length, isInitialized])

  const handleStageClick = (e: any) => {
    // Deselect when clicking on empty area
    if (e.target === e.currentTarget) {
      clearSelection()
    }
  }

  // Mouse panning handlers
  const handleMouseDown = (e: any) => {
    // Only start panning if clicking background (not an object)
    if (e.target === e.target.getStage()) {
      setIsPanning(true)
      panStart.current = { x: e.evt.clientX, y: e.evt.clientY }
      lastPointer.current = { x: e.evt.clientX, y: e.evt.clientY }
      // Deselect any selected object
      selectObject(null)
    }
  }

  const handleMouseMove = (e: any) => {
    if (!isPanning || !panStart.current) return
    const pointer = { x: e.evt.clientX, y: e.evt.clientY }
    const delta = {
      x: pointer.x - lastPointer.current!.x,
      y: pointer.y - lastPointer.current!.y,
    }
    updateStageOffset(delta)
    lastPointer.current = pointer
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    panStart.current = null
    lastPointer.current = null
  }

  // Touch panning handlers (two-finger pan)
  const handleTouchStart = (e: any) => {
    if (e.evt.touches && e.evt.touches.length === 2) {
      setTouchPan(true)
      panStart.current = {
        x: (e.evt.touches[0].clientX + e.evt.touches[1].clientX) / 2,
        y: (e.evt.touches[0].clientY + e.evt.touches[1].clientY) / 2,
      }
      lastPointer.current = { ...panStart.current }
      selectObject(null)
    }
  }

  const handleTouchMove = (e: any) => {
    if (!touchPan || !panStart.current || !(e.evt.touches && e.evt.touches.length === 2)) return
    const pointer = {
      x: (e.evt.touches[0].clientX + e.evt.touches[1].clientX) / 2,
      y: (e.evt.touches[0].clientY + e.evt.touches[1].clientY) / 2,
    }
    const delta = {
      x: pointer.x - lastPointer.current!.x,
      y: pointer.y - lastPointer.current!.y,
    }
    updateStageOffset(delta)
    lastPointer.current = pointer
  }

  const handleTouchEnd = (e: any) => {
    setTouchPan(false)
    panStart.current = null
    lastPointer.current = null
  }

  const zoomTools = [
    { icon: <ZoomOut className="h-4 w-4 text-gray-700" /> },
    { icon: <ZoomIn className="h-4 w-4 text-gray-700" /> },
    { icon: <Layout className="h-4 w-4 text-gray-700" /> },
    { icon: <Maximize className="h-4 w-4 text-gray-700" /> },
  ]

  return (
    <div className="relative w-full h-full shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c] bg-white rounded-[10px] border border-gray-200 p-6 flex items-center justify-center">
      {/* Outer background is now plain white */}
      <div
        className="w-full h-full max-w-[1131px] max-h-[100%] overflow-hidden transition-all duration-200 ease-in-out flex items-center justify-center"
        style={{ overflow: "hidden" }}
        ref={containerRef}
      >
        {containerRef.current && (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            x={stageOffset.x}
            y={stageOffset.y}
            onClick={handleStageClick}
            onTap={handleStageClick}
            scale={{ x: zoomLevel, y: zoomLevel }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Layer>
              {objects.map((obj) => {
                if (obj.type === "image") {
                  return (
                    <KonvaImage
                      key={obj.id}
                      object={obj}
                      isSelected={selectedObjectIds.includes(obj.id)}
                      onSelect={(e: any) => {
                        if (e.evt.shiftKey) {
                          selectObject(obj.id, true)
                        } else {
                          selectObject(obj.id)
                        }
                      }}
                    />
                  )
                } else if (obj.type === "text") {
                  return (
                    <KonvaText
                      key={obj.id}
                      object={obj}
                      isSelected={selectedObjectIds.includes(obj.id)}
                      onSelect={(e: any) => {
                        if (e.evt.shiftKey) {
                          selectObject(obj.id, true)
                        } else {
                          selectObject(obj.id)
                        }
                      }}
                    />
                  )
                }
                return null
              })}
            </Layer>
          </Stage>
        )}
      </div>
      {/* Zoom controls and share button */}
      <div className="inline-flex items-center gap-2 absolute top-4 right-4">
        <div className="inline-flex flex-col items-end justify-center gap-2 p-2 relative flex-[0_0_auto] bg-white rounded-[100px] shadow-lg">
          <div className="flex w-[171px] items-center relative flex-[0_0_auto]">
            <div className="inline-flex items-center relative flex-[0_0_auto]">
              <div
                className="flex w-8 h-8 items-center justify-center gap-1 p-1 relative cursor-pointer"
                onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.25))}
              >
                {zoomTools[0].icon}
              </div>

              <div className="inline-flex h-8 items-center px-1.5 py-2 relative flex-[0_0_auto] rounded-[100px]">
                <div className="relative w-fit font-medium text-neutral-950 text-xs text-center tracking-[0.06px] leading-4 whitespace-nowrap">
                  {Math.round(zoomLevel * 100)}%
                </div>
              </div>

              <div
                className="flex w-8 h-8 items-center justify-center gap-1 p-1 relative cursor-pointer"
                onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
              >
                {zoomTools[1].icon}
              </div>
            </div>

            <div className="flex w-8 h-8 items-center justify-center gap-1 p-1 relative cursor-pointer">
              {zoomTools[2].icon}
            </div>

            <div className="flex w-8 h-8 items-center justify-center gap-1 p-1 relative cursor-pointer">
              {zoomTools[3].icon}
            </div>
          </div>
        </div>

        <div className="inline-flex flex-col items-end justify-center gap-2 p-2 relative flex-[0_0_auto] bg-white rounded-[100px] shadow-lg">
          <div className="inline-flex items-center gap-2 relative flex-[0_0_auto]">
            <Button className="inline-flex h-8 items-center px-3 py-2 relative flex-[0_0_auto] bg-[#0281f2] rounded-[100px] hover:bg-[#0281f2]/90">
              <span className="relative w-fit font-semibold text-white text-xs text-center tracking-[0.06px] leading-4 whitespace-nowrap">
                Share
              </span>
            </Button>

            <div className="relative w-8 h-8 rounded-[100px] bg-gray-200 flex items-center justify-center">
              <span className="text-sm">JD</span>
            </div>
          </div>
        </div>
      </div>
      <CanvasToolbar /> {/* CanvasToolbar component */}
    </div>
  )
}
