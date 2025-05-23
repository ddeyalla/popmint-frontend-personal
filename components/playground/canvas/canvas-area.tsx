"use client"

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react"
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

// Constants
const MIN_ZOOM_LEVEL = 0.1; // 10%
const MAX_ZOOM_LEVEL = 10; // 1000%
const KEYBOARD_ZOOM_INCREMENT = 0.1; // Increment for keyboard shortcuts
const BUTTON_ZOOM_INCREMENT = 0.25; // Increment for UI buttons
const WHEEL_ZOOM_SENSITIVITY_FACTOR = 1.008;
const DEFAULT_ASPECT_RATIO = 16 / 9;
const FIT_TO_SCREEN_PADDING = 40; // px
const SAMPLE_IMAGE_INITIAL_X = 20;
const SAMPLE_IMAGE_INITIAL_Y = 20;
const SAMPLE_IMAGE_SPACING_X = 420;
const SAMPLE_IMAGE_ADD_DELAY_MS = 100;
const GENERATED_IMAGE_SIZE = 512; // Size for generated images (512x512)
const GENERATED_IMAGE_GAP = 40; // Gap between generated images
const MIN_STAGE_WIDTH_4K = 1920;
const MIN_STAGE_HEIGHT_4K = 1080;
const DEFAULT_STAGE_WIDTH = 800;
const DEFAULT_STAGE_HEIGHT = 600;


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
  const [stageSize, setStageSize] = useState({ width: DEFAULT_STAGE_WIDTH, height: DEFAULT_STAGE_HEIGHT })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number } | null>(null)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const [touchPan, setTouchPan] = useState(false)
  const [dragStartPositions, setDragStartPositions] = useState<{ [id: string]: { x: number; y: number } }>({})
  const [duplicationActive, setDuplicationActive] = useState(false)
  const [duplicationOriginalId, setDuplicationOriginalId] = useState<string | null>(null)
  const [duplicationData, setDuplicationData] = useState<{
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null)
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false)
  const lastPinchDistance = useRef<number | null>(null);
  const lastPinchMidpoint = useRef<{ x: number; y: number } | null>(null);

  const debouncedResize = useCallback((entries: ResizeObserverEntry[] = []) => {
    if (!containerRef.current || !stageRef.current) return;

    // Get the full container dimensions without any constraints
    const containerWidth = containerRef.current.offsetWidth || DEFAULT_STAGE_WIDTH;
    const containerHeight = containerRef.current.offsetHeight || DEFAULT_STAGE_HEIGHT;

    // Use the full container dimensions to avoid trimming
    let finalWidth = containerWidth;
    let finalHeight = containerHeight;

    // For 4K screens, ensure minimum dimensions
    const minWidth = window.innerWidth >= 3840 ? MIN_STAGE_WIDTH_4K : DEFAULT_STAGE_WIDTH;
    const minHeight = window.innerWidth >= 3840 ? MIN_STAGE_HEIGHT_4K : DEFAULT_STAGE_HEIGHT;

    // Ensure we don't go below minimum dimensions
    finalWidth = Math.max(finalWidth, minWidth);
    finalHeight = Math.max(finalHeight, minHeight);

    console.log('Canvas resize: container dimensions', containerWidth, 'x', containerHeight);
    console.log('Canvas resize: final dimensions', finalWidth, 'x', finalHeight);

    setStageSize({ width: finalWidth, height: finalHeight });
    stageRef.current.width(finalWidth);
    stageRef.current.height(finalHeight);
    stageRef.current.batchDraw();
  }, [isSidebarCollapsed]); // isSidebarCollapsed can affect containerRef.current.offsetWidth/Height indirectly

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      requestAnimationFrame(() => debouncedResize(entries));
    });

    debouncedResize([]);
    observer.observe(containerRef.current);

    const handleCanvasResizeEvent = () => {
      requestAnimationFrame(() => debouncedResize([]));
    };

    window.addEventListener('canvas-resize', handleCanvasResizeEvent);

    return () => {
      observer.disconnect();
      window.removeEventListener('canvas-resize', handleCanvasResizeEvent);
    };
  }, [debouncedResize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllObjects();
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        let newZoomLevel = zoomLevel;
        switch (e.key) {
          case "+":
          case "=":
            e.preventDefault();
            newZoomLevel = Math.min(MAX_ZOOM_LEVEL, zoomLevel + KEYBOARD_ZOOM_INCREMENT);
            break;
          case "-":
          case "_":
            e.preventDefault();
            newZoomLevel = Math.max(MIN_ZOOM_LEVEL, zoomLevel - KEYBOARD_ZOOM_INCREMENT);
            break;
          default:
            return; // Not a zoom key
        }
        if (newZoomLevel !== zoomLevel) {
          setZoomLevel(newZoomLevel);
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && document.activeElement === document.body) {
        if (selectedObjectIds.length > 0) {
          deleteObject(selectedObjectIds);
        }
        return;
      }

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
  }, [zoomLevel, selectedObjectIds, setZoomLevel, deleteObject, selectAllObjects, duplicationActive, isAltKeyPressed]); // Added isAltKeyPressed and duplicationActive

  useEffect(() => {
    const hasChatImages = messages.some(
      (msg) =>
        msg.type === "agent_output" &&
        Array.isArray(msg.imageUrls) &&
        msg.imageUrls.length > 0
    );
    if (!isInitialized && objects.length === 0 && !hasChatImages) {
      setIsInitialized(true)

      const sampleImages = [
        "/image-1.png",
        "/image-2.png",
        "/image-3.png",
        "/image-4.png"
      ];

      const existingUrls = new Set(objects.map(obj => obj.src));
      sampleImages.forEach((url, index) => {
        if (!existingUrls.has(url)) {
          setTimeout(() => {
            // Ensure addImage is fresh from the store if called in a loop/timeout
            useCanvasStore.getState().addImage(
              url,
              SAMPLE_IMAGE_INITIAL_X + index * SAMPLE_IMAGE_SPACING_X,
              SAMPLE_IMAGE_INITIAL_Y
            );
          }, index * SAMPLE_IMAGE_ADD_DELAY_MS);
        }
      });
    }
  }, [objects, isInitialized, messages]); // objects is a dependency, ensure addImage is stable or use getState()

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.currentTarget) {
      clearSelection()
    }
  }, [clearSelection]);

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || e.target !== stage) return;

    if (toolMode === 'hand' || (toolMode === 'move' && e.evt.button === 1)) {
      setIsPanning(true);
      stage.container().style.cursor = 'grabbing';
      panStart.current = stage.getPointerPosition();
      lastPointer.current = stage.getPointerPosition();
    }
  }, [toolMode]); // Removed setIsPanning from deps as it's a setState from the same scope

  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (isPanning && panStart.current && lastPointer.current && (toolMode === 'hand' || (toolMode === 'move' && e.evt.buttons === 4))) { // Check e.evt.buttons for middle mouse drag
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const delta = {
        x: pointer.x - lastPointer.current.x,
        y: pointer.y - lastPointer.current.y,
      };
      updateStageOffset(delta);
      lastPointer.current = pointer;
    }

    if (duplicationActive && duplicationData && selectedObjectIds.length === 1) {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const selectedDuplicatedObject = objects.find(obj => obj.id === selectedObjectIds[0]);
      if (selectedDuplicatedObject) {
        updateObject(selectedDuplicatedObject.id, {
          x: duplicationData.offsetX + (pointer.x - duplicationData.startX) / zoomLevel,
          y: duplicationData.offsetY + (pointer.y - duplicationData.startY) / zoomLevel
        });
      }
    }
  }, [toolMode, isPanning, updateStageOffset, duplicationActive, duplicationData, selectedObjectIds, zoomLevel, objects, updateObject]);

  const handleMouseUp = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage && toolMode === 'hand') {
      stage.container().style.cursor = 'grab';
    }

    setIsPanning(false);
    panStart.current = null;
    lastPointer.current = null;

    if (duplicationActive) {
      setDuplicationActive(false);
      setDuplicationOriginalId(null);
      setDuplicationData(null);
    }
  }, [toolMode, duplicationActive]); // Removed setIsPanning and other setters from deps

  const handleTouchStart = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (toolMode === 'hand' || e.evt.touches.length === 2) { // Allow two-finger pan regardless of toolMode
      setTouchPan(true);
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches.length > 1 ? e.evt.touches[1] : touch1;
      const mid = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      panStart.current = mid;
      lastPointer.current = { ...mid }; // Ensure new object
      stage.container().style.cursor = 'grabbing';
    }
  }, [toolMode]); // Removed setTouchPan

  const handleTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    if (!containerRef.current) return;
    const stage = e.target.getStage();
    if (!stage) return;

    if (e.evt.touches && e.evt.touches.length === 2) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const midpoint = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      if (lastPinchDistance.current !== null && lastPinchMidpoint.current !== null) { // Ensure lastPinchMidpoint.current is also not null
        const deltaDistance = distance - lastPinchDistance.current;

        // Only zoom if movement is significant to avoid jitter
        if (Math.abs(deltaDistance) > 2) {
          let newZoom = zoomLevel * (1 + deltaDistance / 300); // Sensitivity factor
          newZoom = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, newZoom));

          const stageBox = stage.container().getBoundingClientRect();
          const pointerToZoomAt = { // Point in stage coordinates
            x: (midpoint.x - stageBox.left - stageOffset.x) / zoomLevel,
            y: (midpoint.y - stageBox.top - stageOffset.y) / zoomLevel,
          };

          const newOffset = {
            x: midpoint.x - stageBox.left - pointerToZoomAt.x * newZoom,
            y: midpoint.y - stageBox.top - pointerToZoomAt.y * newZoom,
          };

          setZoomLevel(newZoom);
          setStageOffset(newOffset);
        }
      }
      lastPinchDistance.current = distance;
      lastPinchMidpoint.current = midpoint; // Store current midpoint
      return;
    }

    // Pan with a single finger if in 'hand' mode, or two fingers (already handled by pinch-zoom return)
    // This condition might need refinement if single finger pan in 'hand' mode is desired alongside two-finger pinch/pan
    if (touchPan && panStart.current && lastPointer.current && e.evt.touches && e.evt.touches.length === 1 && toolMode === 'hand') {
      const touch = e.evt.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const delta = {
        x: currentPos.x - lastPointer.current.x,
        y: currentPos.y - lastPointer.current.y,
      };
      updateStageOffset(delta);
      lastPointer.current = currentPos;
    } else if (touchPan && panStart.current && lastPointer.current && e.evt.touches && e.evt.touches.length === 2) {
        // This case should be mostly handled by the pinch-zoom logic which returns early.
        // If pinch-zoom doesn't occur (e.g. no significant distance change), allow two-finger panning.
        const touch1 = e.evt.touches[0];
        const touch2 = e.evt.touches[1];
        const mid = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2,
        };
        const delta = {
            x: mid.x - lastPointer.current.x,
            y: mid.y - lastPointer.current.y,
        };
        updateStageOffset(delta);
        lastPointer.current = mid;
    }

  }, [touchPan, zoomLevel, stageOffset, setZoomLevel, setStageOffset, updateStageOffset, toolMode]);

  const handleTouchEnd = useCallback(() => {
    setTouchPan(false);
    panStart.current = null;
    lastPointer.current = null;
    lastPinchDistance.current = null;
    lastPinchMidpoint.current = null;
  }, []); // Removed setTouchPan

  const handleSelect = useCallback((id: string, e?: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!e) return;
    const stage = e.target.getStage();
    if (!stage) return;

    if (e.evt instanceof MouseEvent && isAltKeyPressed) {
      e.evt.preventDefault();
      const originalObject = objects.find(obj => obj.id === id);
      if (!originalObject) return;

      const newId = duplicateObject(id); // This creates and adds the duplicate to the store
      if (!newId) return;

      // Select only the newly duplicated object
      selectObject([newId]);

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // The duplicated object is already at its new position from the store's duplicateObject logic
      // We need its initial position to calculate drag delta for the *visual* dragging feedback.
      const duplicatedObjectFromStore = useCanvasStore.getState().objects.find(obj => obj.id === newId);
      if (!duplicatedObjectFromStore) return;

      setDuplicationActive(true);
      setDuplicationOriginalId(id); // Keep track of the original for context if needed
      setDuplicationData({
        offsetX: duplicatedObjectFromStore.x, // Its actual starting X from store
        offsetY: duplicatedObjectFromStore.y, // Its actual starting Y from store
        startX: pointer.x, // Mouse pointer start X for calculating delta
        startY: pointer.y  // Mouse pointer start Y for calculating delta
      });
      return;
    }

    if (e.evt instanceof MouseEvent && e.evt.shiftKey) {
      if (selectedObjectIds.includes(id)) {
        selectObject(selectedObjectIds.filter((sid) => sid !== id));
      } else {
        selectObject([...selectedObjectIds, id]);
      }
    } else {
      selectObject([id]);
    }
  }, [isAltKeyPressed, duplicateObject, objects, selectedObjectIds, selectObject]); // Removed setters

  const handleGroupDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    // This handler seems to be for a direct Konva.Group drag, but the current setup uses
    // a different onDragEnd for the <Group> component wrapping selected items.
    // If this is still intended to be used, ensure it's wired up correctly.
    // The onDragEnd prop on the <Group> component below is likely the one being used.
    const groupNode = e.target as Konva.Group
    if (!groupNode) return

    const dx = groupNode.x()
    const dy = groupNode.y()

    selectedObjectIds.forEach((id) => {
      const obj = objects.find((o) => o.id === id)
      if (obj) {
        useCanvasStore.getState().updateObject(id, {
          x: (obj.x || 0) + dx,
          y: (obj.y || 0) + dy,
        })
      }
    })
    groupNode.position({ x: 0, y: 0 })
    groupNode.getStage()?.draggable(true)
  }, [selectedObjectIds, objects]);

  const handleGroupTransformEnd = useCallback((e: KonvaEventObject<Event>) => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    transformer.nodes().forEach((node: Konva.Node) => {
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
            // node.rotation(0); // Rotation persistence is a TODO, reset visual for now if not saved
        }
    });
    transformer.getStage()?.draggable(true); // Re-enable stage draggable if it was disabled during transform
  }, [objects]);

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    if (!e.evt.ctrlKey) return; // Only zoom if Ctrl key is pressed

    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = zoomLevel;
    const scaleBy = Math.pow(WHEEL_ZOOM_SENSITIVITY_FACTOR, -e.evt.deltaY);
    let newScale = oldScale * scaleBy;
    newScale = Math.max(MIN_ZOOM_LEVEL, Math.min(MAX_ZOOM_LEVEL, newScale));

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stageOffset.x) / oldScale,
      y: (pointer.y - stageOffset.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setZoomLevel(newScale);
    setStageOffset(newPos);
  }, [zoomLevel, stageOffset, setZoomLevel, setStageOffset]);

  const onFitToScreen = useCallback(() => {
    if (!stageRef.current || objects.length === 0 || !containerRef.current) return;

    const minX = Math.min(...objects.map((obj) => obj.x));
    const minY = Math.min(...objects.map((obj) => obj.y));
    const maxX = Math.max(...objects.map((obj) => (obj.x + (obj.width || 0))));
    const maxY = Math.max(...objects.map((obj) => (obj.y + (obj.height || 0))));

    const contentWidth = Math.max(1, maxX - minX); // Ensure contentWidth is at least 1
    const contentHeight = Math.max(1, maxY - minY); // Ensure contentHeight is at least 1

    // Use full container dimensions with minimal padding
    const availableWidth = containerRef.current.offsetWidth || DEFAULT_STAGE_WIDTH;
    const availableHeight = containerRef.current.offsetHeight || DEFAULT_STAGE_HEIGHT;

    // Calculate scale to fit content within available space
    const scale = Math.min(
      (availableWidth - FIT_TO_SCREEN_PADDING) / contentWidth,
      (availableHeight - FIT_TO_SCREEN_PADDING) / contentHeight,
      MAX_ZOOM_LEVEL // Don't zoom in beyond MAX_ZOOM_LEVEL when fitting
    );

    const finalScale = Math.max(MIN_ZOOM_LEVEL, scale); // Ensure scale is not below MIN_ZOOM_LEVEL

    // Center content in the available space
    const offsetX = (availableWidth - contentWidth * finalScale) / 2 - minX * finalScale;
    const offsetY = (availableHeight - contentHeight * finalScale) / 2 - minY * finalScale;

    console.log('Fit to screen: scale', finalScale, 'offset', offsetX, offsetY);

    setZoomLevel(Number(finalScale.toFixed(2)));
    setStageOffset({ x: offsetX, y: offsetY });
  }, [objects, setZoomLevel, setStageOffset]); // containerRef and stageRef are stable refs

  useEffect(() => {
    const currentTransformer = transformerRef.current;
    const currentStage = stageRef.current;
    if (!currentTransformer || !currentStage) return;

    // Using setTimeout to ensure nodes are available in the DOM/Konva tree
    // Especially important if selectedObjectIds change rapidly or come from async ops
    const timerId = setTimeout(() => {
      if (!currentTransformer || !currentStage) return; // Re-check refs inside timeout

      let nodesToTransform: Konva.Node[] = [];
      if (selectedObjectIds.length === 1) {
        const node = currentStage.findOne(`#${selectedObjectIds[0]}`);
        if (node) {
          nodesToTransform = [node];
        }
      } else if (selectedObjectIds.length > 1 && groupRef.current) {
        // Ensure the groupRef is up-to-date for multi-selection transform
        // The group itself is transformed, and its children (selected objects) move with it.
        nodesToTransform = [groupRef.current];
      }

      currentTransformer.nodes(nodesToTransform);
      currentTransformer.getLayer()?.batchDraw();
    }, 0);

    return () => clearTimeout(timerId); // Cleanup timeout
  }, [selectedObjectIds]); // stageRef and groupRef are refs, their .current might change but effect shouldn't run for that. Rely on selectedObjectIds.

  const zoomButtonActions = {
    zoomOut: () => setZoomLevel(Math.max(MIN_ZOOM_LEVEL, zoomLevel - BUTTON_ZOOM_INCREMENT)),
    zoomIn: () => setZoomLevel(Math.min(MAX_ZOOM_LEVEL, zoomLevel + BUTTON_ZOOM_INCREMENT)),
    fitToScreen: onFitToScreen,
    // layout: () => { /* TODO: Implement Layout cycle logic if needed */ },
  };

  return (
    <div
      className={cn(
        "relative w-full h-full bg-white overflow-hidden",
        isSidebarCollapsed ? "fixed inset-0 z-30" : "rounded-[0px] shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c]",
        // Remove padding to allow canvas to expand edge-to-edge
      )}
    >
      <div className="pointer-events-none absolute rounded-[0px] bg-[#FAFAFA] inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgb3BhY2l0eT0iMC4yIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]"></div>

      <div
        key={isSidebarCollapsed ? 'collapsed' : 'expanded'} // Key to help React re-evaluate if container changes drastically
        className={cn(
          "w-full h-full overflow-hidden",
          "flex items-center justify-center"
        )}
        style={{
          overflow: "hidden", // Ensure overflow hidden is applied
          padding: 0, // No padding
          margin: 0, // No margin
          width: "100%", // Full width
          height: "100%" // Full height
        }}
        ref={containerRef}
      >
        {containerRef.current && ( // Ensure containerRef is available before rendering Stage
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            x={stageOffset.x}
            y={stageOffset.y}
            onClick={handleStageClick}
            onTap={handleStageClick} // For touch devices
            scale={{ x: zoomLevel, y: zoomLevel }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            draggable={false} // Stage draggable is false; panning is custom. Group is draggable for multi-select.
            className={cn(
              "transition-transform duration-300 ease-in-out", // Smooth zoom/pan
              "w-full h-full" // Ensure stage fills the container
            )}
          >
            <Layer>
              {selectedObjectIds.length > 1 ? (
                <>
                  {/* Render unselected objects directly */}
                  {objects.filter(obj => !selectedObjectIds.includes(obj.id)).map(obj =>
                    obj.type === 'image' ? (
                      <KonvaImage
                        key={obj.id}
                        id={obj.id}
                        object={obj}
                        isSelected={false}
                        onSelect={e => handleSelect(obj.id, e)}
                        isMultiSelected={false} // Individual object, not part of the current multi-selection group
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
                  {/* Render selected objects inside a draggable, transformable group */}
                  <Group
                    ref={groupRef}
                    draggable
                    onDragStart={(e) => {
                      // Prevent stage drag conflict if stage was draggable: e.target.getStage()?.draggable(false);
                      const currentPositions: { [id: string]: { x: number; y: number } } = {};
                      objects.forEach(obj => {
                        if (selectedObjectIds.includes(obj.id)) {
                          currentPositions[obj.id] = { x: obj.x, y: obj.y };
                        }
                      });
                      setDragStartPositions(currentPositions);
                    }}
                    onDragEnd={e => {
                      const groupNode = groupRef.current;
                      if (!groupNode) return;
                      const dx = groupNode.x(); // Delta X from group's drag
                      const dy = groupNode.y(); // Delta Y from group's drag
                      selectedObjectIds.forEach(id => {
                        const startPos = dragStartPositions[id];
                        if (startPos) {
                          useCanvasStore.getState().updateObject(id, {
                            x: startPos.x + dx,
                            y: startPos.y + dy,
                          });
                        }
                      });
                      groupNode.position({ x: 0, y: 0 }); // Reset group position for next drag
                      setDragStartPositions({});
                      // e.target.getStage()?.draggable(true); // Re-enable if disabled
                    }}
                    // Position the group based on the average of its children or a reference point if needed.
                    // For simplicity, starting at (0,0) and letting transformer handle relative positions.
                    x={0}
                    y={0}
                  >
                    {objects.filter(obj => selectedObjectIds.includes(obj.id)).map(obj =>
                      obj.type === 'image' ? (
                        <KonvaImage
                          key={obj.id}
                          id={obj.id}
                          object={obj} // Pass the full object for its internal positioning
                          isSelected={true}
                          onSelect={e => handleSelect(obj.id, e)}
                          isMultiSelected={true} // This object is part of the current multi-selection
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
                // Single or no selection: render all objects, Transformer targets the selected one
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
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                // onTransformEnd event is handled by handleGroupTransformEnd (if group is transformed)
                // or should be attached here if individual nodes are transformed directly by the transformer without a group.
                // The current setup has transformerRef.current.nodes([groupRef.current]) or [node]
                // So, the transform end should be on the transformer itself or the nodes it targets.
                // Konva's Transformer component itself doesn't have onTransformEnd. It's usually handled on the nodes.
                // The current handleGroupTransformEnd is a good generic handler.
              />
            </Layer>
          </Stage>
        )}
      </div>
      <TooltipProvider>
        <div className="inline-flex items-center gap-2 absolute top-4 right-4">
          <div className="inline-flex flex-col items-end justify-center gap-2 p-2 relative flex-[0_0_auto] bg-white rounded-[100px] shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c]">
            <div className="flex w-auto items-center relative flex-[0_0_auto]"> {/* w-[171px] removed for auto width */}
              <div className="inline-flex items-center relative flex-[0_0_auto]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomButtonActions.zoomOut}>
                      <ZoomOut className="h-4 w-4 text-gray-700" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Zoom Out</p></TooltipContent>
                </Tooltip>

                <div className="inline-flex hover:bg-gray-100 rounded-[10px] h-8 items-center px-1.5 py-2 relative flex-[0_0_auto] min-w-[40px] justify-center">
                  <div className="relative w-fit font-medium text-neutral-950 text-xs text-center tracking-[0.06px] leading-4 whitespace-nowrap">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomButtonActions.zoomIn}>
                      <ZoomIn className="h-4 w-4 text-gray-700" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>Zoom In</p></TooltipContent>
                </Tooltip>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => { /* TODO: Layout */ }}>
                    <Layout className="h-4 w-4 text-gray-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Layout (TBD)</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomButtonActions.fitToScreen}>
                    <Maximize className="h-4 w-4 text-gray-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Fit to Screen</p></TooltipContent>
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
      <CanvasToolbar />
    </div>
  );
}