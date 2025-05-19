"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Stage, Layer, Group, Transformer } from "react-konva"
import Konva from 'konva'; // Import Konva namespace for types
import { KonvaEventObject } from 'konva/lib/Node'; // Import specific event type
import { KonvaImage } from "./konva-image"
import { KonvaText } from "./konva-text"
import { useCanvasStore } from "@/store/canvasStore"
import { useChatStore } from "@/store/chatStore"
import { ZoomIn, ZoomOut, Maximize, Layout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CanvasToolbar } from "./canvas-toolbar" // Import CanvasToolbar
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
    addImage,
    addText,
    updateObject,
    toolMode,
    duplicateObject,
    isSidebarCollapsed,
  } = useCanvasStore()
  const messages = useChatStore((state) => state.messages)
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number } | null>(null)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const [touchPan, setTouchPan] = useState(false)
  const [dragStartPositions, setDragStartPositions] = useState<{ [id: string]: { x: number; y: number } }>({})
  const [isDuplicating, setIsDuplicating] = useState(false)
  const duplicateStartPos = useRef<{ x: number; y: number } | null>(null)
  const [duplicationActive, setDuplicationActive] = useState(false)
  const [duplicationOriginalId, setDuplicationOriginalId] = useState<string | null>(null)
  const [duplicationData, setDuplicationData] = useState<{
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null)
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false)

  // Handle stage resize with ResizeObserver for more accurate size tracking
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth || 800;
        const height = containerRef.current.offsetHeight || 600;
        setStageSize({
          width,
          height,
        })
      }
    }

    // Initial size update
    updateSize()

    // Use ResizeObserver for more accurate size detection
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also keep the window resize listener as a fallback
    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is on input elements
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;

      // Cmd/Ctrl + A: select all image frames
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllObjects();
        return;
      }

      // Zoom shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "+":
          case "=": // Handle both + and = keys for zoom in
            e.preventDefault();
            const newZoomIn = Math.min(2, zoomLevel + 0.25); // Max zoom 200%
            if (newZoomIn !== zoomLevel) {
              setZoomLevel(newZoomIn);
            }
            return;
          case "-":
          case "_": // Handle both - and _ keys for zoom out
            e.preventDefault();
            const newZoomOut = Math.max(0.25, zoomLevel - 0.25); // Min zoom 25%
            if (newZoomOut !== zoomLevel) {
              setZoomLevel(newZoomOut);
            }
            return;
        }
      }

      // Delete: delete all selected
      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement === document.body) {
        if (selectedObjectIds.length > 0) {
          deleteObject(selectedObjectIds);
        }
        return;
      }

      // Undo/Redo (existing)
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        useCanvasStore.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key === "z") || e.key === "y")) {
        e.preventDefault();
        useCanvasStore.getState().redo();
        return;
      }

      if (e.key === 'Alt' || e.key === 'Option') {
        setIsAltKeyPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.key === 'Option') {
        setIsAltKeyPressed(false);
        
        // If we're in the middle of duplication, complete it
        if (duplicationActive) {
          setDuplicationActive(false);
          setDuplicationOriginalId(null);
          setDuplicationData(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [zoomLevel, selectedObjectIds, setZoomLevel, deleteObject, selectAllObjects, duplicationActive]);

  // Process image messages from chat
  useEffect(() => {
    const imageMessages = messages.filter(
      (msg) =>
        msg.type === "agentOutput" && msg.subType === "image_generated" && msg.imageUrls && msg.imageUrls.length > 0,
    )

    // Get the latest image message
    const latestMessage = imageMessages[imageMessages.length - 1]
    if (latestMessage && latestMessage.imageUrls) {
      // Check for existing images before adding
      const existingUrls = new Set(objects.map(obj => obj.src))
      latestMessage.imageUrls.forEach((url, index) => {
        if (!existingUrls.has(url)) {
          const addImage = useCanvasStore.getState().addImage
          addImage(url, 20 + index * 420, 20)
        }
      })
    }
  }, [messages, objects])

  // For demo purposes, add sample images if canvas is empty
  useEffect(() => {
    // Check if there are any chat-generated images
    const hasChatImages = messages.some(
      (msg) =>
        msg.type === "agentOutput" &&
        msg.subType === "image_generated" &&
        Array.isArray(msg.imageUrls) &&
        msg.imageUrls.length > 0
    );
    if (!isInitialized && objects.length === 0 && !hasChatImages) {
      setIsInitialized(true)

      // Sample product images
      const sampleImages = [
        "/image-1.png",
        "/image-2.png",
        "/image-3.png",
        "/image-4.png"
      ]

      // Add sample images with spacing, but only if they don't already exist
      const existingUrls = new Set(objects.map(obj => obj.src))
      sampleImages.forEach((url, index) => {
        if (!existingUrls.has(url)) {
          setTimeout(() => {
            const addImage = useCanvasStore.getState().addImage
            addImage(url, 20 + index * 420, 20)
          }, index * 100) // Stagger the additions to avoid overwhelming the renderer
        }
      })
    }
  }, [objects.length, isInitialized, messages])

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.currentTarget) {
      clearSelection()
    }
  }

  // Add cursor style management
  useEffect(() => {
    if (!stageRef.current) return;
    const stage = stageRef.current;
    const container = stage.container();

    // Set initial cursor based on tool mode
    switch (toolMode) {
      case 'move':
        container.style.cursor = 'default';
        break;
      case 'hand':
        container.style.cursor = 'grab';
        break;
      case 'scale':
        container.style.cursor = 'nesw-resize';
        break;
      default:
        container.style.cursor = 'default';
    }

    // Handle cursor changes during interactions
    stage.on('mousedown touchstart', () => {
      if (toolMode === 'hand') {
        container.style.cursor = 'grabbing';
      }
    });

    stage.on('mouseup touchend', () => {
      if (toolMode === 'hand') {
        container.style.cursor = 'grab';
      }
    });

    // Cleanup
    return () => {
      stage.off('mousedown touchstart mouseup touchend');
      container.style.cursor = 'default';
    };
  }, [toolMode]);

  // Tracked object and state for Alt+drag duplication
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Only handle stage clicks (not object clicks)
    if (e.target !== stage) return;

    if (toolMode === 'hand' || (toolMode === 'move' && e.evt.button === 1)) { // Middle mouse button for move
      setIsPanning(true);
      stage.container().style.cursor = 'grabbing';
      panStart.current = stage.getPointerPosition();
      lastPointer.current = stage.getPointerPosition();
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Handle panning
    if ((toolMode === 'hand' || (toolMode === 'move' && e.evt.button === 1)) && isPanning && panStart.current && lastPointer.current) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const delta = {
        x: pointer.x - lastPointer.current.x,
        y: pointer.y - lastPointer.current.y,
      };
      updateStageOffset(delta);
      lastPointer.current = pointer;
    }

    // Handle duplication dragging
    if (duplicationActive && duplicationData && selectedObjectIds.length === 1) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const deltaX = (pointer.x - duplicationData.startX) / zoomLevel;
      const deltaY = (pointer.y - duplicationData.startY) / zoomLevel;

      // Get the selected object (should be the duplicate)
      const selectedObject = objects.find(obj => obj.id === selectedObjectIds[0]);
      if (selectedObject) {
        // Update the duplicate position
        updateObject(selectedObject.id, {
          x: duplicationData.offsetX + deltaX,
          y: duplicationData.offsetY + deltaY
        });
      }
    }
  };

  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (toolMode === 'hand') {
      stage.container().style.cursor = 'grab';
    }
    
    setIsPanning(false);
    panStart.current = null;
    lastPointer.current = null;

    // End duplication if active
    if (duplicationActive) {
      setDuplicationActive(false);
      setDuplicationOriginalId(null);
      setDuplicationData(null);
    }
  };

  // Update touch handlers to respect tool mode
  const handleTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (toolMode === 'hand' || e.evt.touches.length === 2) {
      setTouchPan(true);
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches.length > 1 ? e.evt.touches[1] : touch1;
      const mid = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      panStart.current = mid;
      lastPointer.current = { ...mid };
      stage.container().style.cursor = 'grabbing';
    }
  };

  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    if (!touchPan || !panStart.current || !lastPointer.current || !(e.evt.touches && e.evt.touches.length === 2)) return
    const stage = e.target.getStage();
    if (!stage) return;

    const touch1 = e.evt.touches[0]
    const touch2 = e.evt.touches[1]
    const mid = {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }
    const delta = {
      x: mid.x - lastPointer.current.x,
      y: mid.y - lastPointer.current.y,
    }
    // For touch, delta needs to be divided by zoom level if stage drag does not account for it.
    // However, updateStageOffset should ideally take absolute deltas.
    // Let's assume updateStageOffset handles this correctly or stage.dragBoundFunc does.
    // For simplicity, if updateStageOffset expects screen-space delta, this is fine.
    // If it expects stage-space delta, then:
    // updateStageOffset({ x: delta.x / zoomLevel, y: delta.y / zoomLevel });
    updateStageOffset(delta) // Assuming this takes screen-space delta
    lastPointer.current = mid
  }

  const handleTouchEnd = (e: KonvaEventObject<TouchEvent>) => {
    setTouchPan(false)
    panStart.current = null
    lastPointer.current = null
  }

  /**
   * Handle selection with Option/Alt key for duplication
   */
  const handleSelect = (id: string, e?: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!e) return;

    // For Alt/Option + click: Duplicate the object and start dragging the duplicate
    if (e.evt instanceof MouseEvent && isAltKeyPressed) {
      // Prevent default to avoid text selection or other behaviors
      e.evt.preventDefault();
      
      // Create a duplicate via the store method
      const newId = duplicateObject(id);
      if (!newId) return;

      // Get stage position for tracking
      const stage = e.target.getStage();
      if (!stage) return;
      
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      // Find the newly created object
      const duplicatedObject = objects.find(obj => obj.id === newId);
      if (!duplicatedObject) return;
      
      // Store the original position data for dragging calculations
      setDuplicationActive(true);
      setDuplicationOriginalId(id);
      setDuplicationData({
        offsetX: duplicatedObject.x,
        offsetY: duplicatedObject.y,
        startX: pointer.x,
        startY: pointer.y
      });
      
      return;
    }

    // Regular selection handling
    if (e.evt instanceof MouseEvent && e.evt.shiftKey) {
      if (selectedObjectIds.includes(id)) {
        selectObject(selectedObjectIds.filter((sid) => sid !== id));
      } else {
        selectObject([...selectedObjectIds, id]);
      }
    } else {
      selectObject([id]);
    }
  };
  
  /**
   * Handle group drag end
   */
  const handleGroupDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const groupNode = e.target as Konva.Group // e.target is the Konva.Group
    if (!groupNode) return

    const dx = groupNode.x()
    const dy = groupNode.y()

    selectedObjectIds.forEach((id) => {
      const obj = objects.find((o) => o.id === id)
      if (obj) {
        useCanvasStore.getState().updateObject(id, {
          x: (obj.x || 0) + dx, // Ensure obj.x and obj.y are numbers
          y: (obj.y || 0) + dy,
        })
      }
    })
    groupNode.position({ x: 0, y: 0 }) // Reset group position
    groupNode.getStage()?.draggable(true) // Re-enable stage draggable
  }
  
  /**
   * Handle group transform end (also used for single object transform via Transformer)
   */
  const handleGroupTransformEnd = (e: KonvaEventObject<Event>) => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    transformer.nodes().forEach((node: Konva.Node) => { // node is Konva.Node, could be Image or Text
        const obj = objects.find(o => o.id === node.id());
        if (obj) {
            useCanvasStore.getState().updateObject(obj.id, {
                x: node.x(),
                y: node.y(),
                width: node.width() * node.scaleX(),
                height: node.height() * node.scaleY(),
                // rotation: node.rotation(), // TODO: Add 'rotation' to KonvaObject type in canvasStore.ts to persist rotation
            });
            node.scaleX(1);
            node.scaleY(1);
            node.rotation(0); // Reset visual rotation; store update needed for persistence
        }
    });
    transformer.getStage()?.draggable(true);
  }

  // Add the new useEffect for transformer nodes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    setTimeout(() => {
      if (!transformerRef.current || !stageRef.current) return;

      if (selectedObjectIds.length === 1) {
        const node = stageRef.current.findOne(`#${selectedObjectIds[0]}`);
        if (node) {
          transformerRef.current.nodes([node]);
        } else {
          transformerRef.current.nodes([]);
        }
      } else if (selectedObjectIds.length > 1 && groupRef.current) {
        transformerRef.current.nodes([groupRef.current]);
      } else {
        transformerRef.current.nodes([]);
      }
      transformerRef.current.getLayer()?.batchDraw();
    }, 0);
  }, [selectedObjectIds, stageRef.current, groupRef.current]);

  const zoomTools = [
    { icon: <ZoomOut className="h-4 w-4 text-gray-700" /> },
    { icon: <ZoomIn className="h-4 w-4 text-gray-700" /> },
    { icon: <Layout className="h-4 w-4 text-gray-700" /> },
    { icon: <Maximize className="h-4 w-4 text-gray-700" /> },
  ]

  /**
   * Zoom to fit all objects within the visible canvas area
   */
  const onFitToScreen = () => {
    if (!stageRef.current || objects.length === 0 || !containerRef.current) return
    // Calculate bounding box of all objects
    const minX = Math.min(...objects.map((obj) => obj.x))
    const minY = Math.min(...objects.map((obj) => obj.y))
    const maxX = Math.max(...objects.map((obj) => (obj.x + (obj.width || 0))))
    const maxY = Math.max(...objects.map((obj) => (obj.y + (obj.height || 0))))
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    const padding = 40 // px
    const availableWidth = (containerRef.current.offsetWidth || 800) - padding * 2
    const availableHeight = (containerRef.current.offsetHeight || 600) - padding * 2
    // Calculate scale to fit
    const scale = Math.min(
      availableWidth / (contentWidth || 1),
      availableHeight / (contentHeight || 1),
      2 // max zoom
    )
    // Center the content
    const offsetX = padding + (availableWidth - contentWidth * scale) / 2 - minX * scale
    const offsetY = padding + (availableHeight - contentHeight * scale) / 2 - minY * scale
    setZoomLevel(Number(scale.toFixed(2)))
    setStageOffset({ x: offsetX, y: offsetY })
  }

  // Update canvas size when sidebar state changes
  useEffect(() => {
    // Force resize event to update canvas dimensions
    window.dispatchEvent(new Event('resize'));
    
    // Add a small delay to ensure the layout has settled
    const resizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 350); // Match the transition duration
    
    return () => clearTimeout(resizeTimer);
  }, [isSidebarCollapsed]);

  return (
    <div
      className={cn(
        "relative w-full h-full bg-white",
        isSidebarCollapsed ? "absolute inset-0" : "rounded-[10px] shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c]"
      )}
    >
      {/* Dot grid overlay */}
      <div className="pointer-events-none absolute rounded-[10px] bg-[#FAFAFA] inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgb3BhY2l0eT0iMC4yIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
      {/* Outer background is now plain white */}
      <div
        key={isSidebarCollapsed ? 'collapsed' : 'expanded'}
        className={cn(
          "w-full h-full overflow-hidden",
          isSidebarCollapsed ? "w-screen h-screen" : "max-w-[1131px] mx-auto flex items-center justify-center"
        )}
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
            draggable={false} // We handle dragging manually based on tool mode
          >
            <Layer>
              {/* Multi-select: render unselected objects, and selected objects inside a draggable group */}
              {selectedObjectIds.length > 1 ? (
                <>
                  {objects.filter(obj => !selectedObjectIds.includes(obj.id)).map(obj =>
                    obj.type === 'image' ? (
                      <KonvaImage
                        key={obj.id}
                        id={obj.id}
                        object={obj}
                        isSelected={false}
                        onSelect={e => handleSelect(obj.id, e)}
                        isMultiSelected={false}
                      />
                    ) : (
                      <KonvaText
                        key={obj.id}
                        id={obj.id}
                        object={obj}
                        isSelected={false}
                        onSelect={e => handleSelect(obj.id, e)}
                        isMultiSelected={false}
                      />
                    )
                  )}
                  <Group
                    ref={groupRef}
                    draggable
                    onDragStart={() => {
                      const positions: { [id: string]: { x: number; y: number } } = {};
                      objects.forEach(obj => {
                        if (selectedObjectIds.includes(obj.id)) {
                          positions[obj.id] = { x: obj.x, y: obj.y };
                        }
                      });
                      setDragStartPositions(positions);
                    }}
                    onDragEnd={e => {
                      const groupNode = groupRef.current;
                      if (!groupNode) return;
                      const dx = groupNode.x();
                      const dy = groupNode.y();
                      selectedObjectIds.forEach(id => {
                        const start = dragStartPositions[id];
                        if (start) {
                          useCanvasStore.getState().updateObject(id, {
                            x: start.x + dx,
                            y: start.y + dy,
                          });
                        }
                      });
                      groupNode.position({ x: 0, y: 0 });
                      setDragStartPositions({});
                    }}
                    x={0}
                    y={0}
                  >
                    {objects.filter(obj => selectedObjectIds.includes(obj.id)).map(obj =>
                      obj.type === 'image' ? (
                        <KonvaImage
                          key={obj.id}
                          id={obj.id}
                          object={obj}
                          isSelected={true}
                          onSelect={e => handleSelect(obj.id, e)}
                          isMultiSelected={true}
                        />
                      ) : (
                        <KonvaText
                          key={obj.id}
                          id={obj.id}
                          object={obj}
                          isSelected={true}
                          onSelect={e => handleSelect(obj.id, e)}
                          isMultiSelected={true}
                        />
                      )
                    )}
                  </Group>
                </>
              ) : (
                // Single or no selection: render all objects, only selected gets Transformer
                objects.map(obj => {
                  const isSelected = selectedObjectIds.includes(obj.id);
                  return obj.type === 'image' ? (
                    <KonvaImage
                      key={obj.id}
                      id={obj.id}
                      object={obj}
                      isSelected={isSelected}
                      onSelect={e => handleSelect(obj.id, e)}
                      isMultiSelected={false}
                    />
                  ) : (
                    <KonvaText
                      key={obj.id}
                      id={obj.id}
                      object={obj}
                      isSelected={isSelected}
                      onSelect={e => handleSelect(obj.id, e)}
                      isMultiSelected={false}
                    />
                  );
                })
              )}
              {/* Always render a single Transformer */}
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
              />
            </Layer>
          </Stage>
        )}
      </div>
      {/* Zoom controls and share button */}
      <TooltipProvider>
        <div className="inline-flex items-center gap-2 absolute top-4 right-4">
          <div className="inline-flex flex-col items-end justify-center gap-2 p-2 relative flex-[0_0_auto] bg-white rounded-[100px] shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c]">
            <div className="flex w-[171px] items-center relative flex-[0_0_auto]">
              <div className="inline-flex items-center relative flex-[0_0_auto]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex w-8 h-8 hover:bg-gray-100 rounded-full items-center justify-center gap-1 p-1 relative cursor-pointer"
                      onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.25))}
                    >
                      {zoomTools[0].icon}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Zoom Out</p>
                  </TooltipContent>
                </Tooltip>

                <div className="inline-flex hover:bg-gray-100 rounded-[10px] h-8 items-center px-1.5 py-2 relative flex-[0_0_auto]">
                  <div className="relative w-fit font-medium text-neutral-950 text-xs text-center tracking-[0.06px] leading-4 whitespace-nowrap">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex w-8 h-8 items-center hover:bg-gray-100 rounded-full justify-center gap-1 p-1 relative cursor-pointer"
                      onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                    >
                      {zoomTools[1].icon}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Zoom In</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex w-8 h-8 hover:bg-gray-100 rounded-full items-center justify-center gap-1 p-1 relative cursor-pointer"
                    onClick={() => { /* TODO: Implement Layout cycle logic if needed */ }}
                  >
                    {zoomTools[2].icon}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Layout</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex w-8 h-8 hover:bg-gray-100 rounded-full items-center justify-center gap-1 p-1 relative cursor-pointer"
                    onClick={onFitToScreen}
                  >
                    {zoomTools[3].icon}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Fit to Screen</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="inline-flex flex-col items-end justify-center gap-2 p-2 relative flex-[0_0_auto] bg-white rounded-[100px] shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c]">
            <div className="inline-flex items-center gap-2 relative flex-[0_0_auto]">
              <Button className="inline-flex h-8 items-center px-3 py-2 relative flex-[0_0_auto] bg-[#0281f2] rounded-[100px] hover:bg-[#0281f2]/90">
                <span className="relative w-fit font-semibold text-white text-xs text-center tracking-[0.06px] leading-4 whitespace-nowrap">
                  Share
                </span>
              </Button>

              <div className="relative w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ease-in-out hover:scale-105 cursor-pointer group">
                <span className="text-xs text-gray-600 font-medium group-hover:text-gray-800">DV</span>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
      <CanvasToolbar /> {/* CanvasToolbar component */}
    </div>
  );
}