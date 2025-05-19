"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Type, Trash2, ZoomIn, ZoomOut, MousePointer } from "lucide-react"
import { useCanvasStore } from "@/store/canvasStore"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function CanvasToolbar() {
  const { undo, redo, addText, selectedObjectIds, deleteObject, zoomLevel, setZoomLevel } = useCanvasStore()

  return (
    <TooltipProvider>
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg flex items-center p-1.5 border border-gray-100">
        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={undo} className="h-9 w-9 rounded-full hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4 text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={redo} className="h-9 w-9 rounded-full hover:bg-gray-100">
                <ArrowRight className="h-4 w-4 text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100">
                <MousePointer className="h-4 w-4 text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => addText("Text")}
                className="h-9 w-9 rounded-full hover:bg-gray-100"
              >
                <Type className="h-4 w-4 text-gray-700" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Text</p>
            </TooltipContent>
          </Tooltip>
        </div>
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
