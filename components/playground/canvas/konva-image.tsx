"use client"

import { useEffect, useRef, useState, memo } from "react"
import { Image, Transformer, Group, Text, Rect, Label, Tag } from "react-konva"
import { type KonvaObject, useCanvasStore } from "@/store/canvasStore"

interface KonvaImageProps {
  object: KonvaObject
  isSelected: boolean
  onSelect: (e: any) => void
  id?: string
  isMultiSelected?: boolean
  onTransformEnd?: (e: any) => void
}

// Create a non-memoized version of the component first
function KonvaImageBase({ object, isSelected, onSelect, id, isMultiSelected, onTransformEnd }: KonvaImageProps) {
  const { updateObject, deleteObject, zoomLevel } = useCanvasStore()
  const imageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  // Extract filename from the src URL
  const getFileName = (src: string = '') => {
    const parts = src.split('/');
    return parts[parts.length - 1];
  }

  // Calculate inverse scale for UI elements to maintain consistent size
  const inverseScale = 1 / zoomLevel;

  useEffect(() => {
    if (!object.src) return

    let didCancel = false;
    let retryCount = 0;
    let img: HTMLImageElement | null = null;

    const loadImage = () => {
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
      img = new window.Image();
      img.crossOrigin = "anonymous";
      console.log('[KonvaImage] Attempting to load image:', object.src, 'crossOrigin:', img.crossOrigin, 'retry:', retryCount);

      img.onload = () => {
        if (didCancel) return;
        setImage(img);
        setImageLoaded(true);
        console.log('[KonvaImage] Image loaded successfully:', object.src);
      };

      img.onerror = (e) => {
        if (didCancel) return;
        console.error('[KonvaImage] Failed to load image:', object.src, e);
        if (retryCount < 1) {
          retryCount++;
          setTimeout(loadImage, 1000); // Retry after 1s
          console.log('[KonvaImage] Retrying image load:', object.src);
        } else {
          setImageLoaded(false);
          setImage(null);
          console.error('[KonvaImage] Image failed after retry:', object.src);
        }
      };

      img.src = object.src || '';
    };

    loadImage();

    return () => {
      didCancel = true;
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
      setImage(null);
      setImageLoaded(false);
    }
  }, [object.src])

  useEffect(() => {
    if (isSelected && !isMultiSelected && transformerRef.current && imageRef.current) {
      try {
        transformerRef.current.nodes([imageRef.current])
        transformerRef.current.getLayer()?.batchDraw()
      } catch (error) {
        console.error("Error updating transformer:", error)
      }
    }
  }, [isSelected, isMultiSelected])

  const handleTransformEnd = (e: any) => {
    if (!imageRef.current) return

    try {
      const node = imageRef.current
      updateObject(object.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * node.scaleX()),
        height: Math.max(5, node.height() * node.scaleY()),
      })

      // Reset scale to avoid double scaling
      node.scaleX(1)
      node.scaleY(1)

      // Call external handler if provided
      onTransformEnd?.(e)
    } catch (error) {
      console.error("Error during transform end:", error)
    }
  }

  const handleDownload = () => {
    if (!object.src) return;
    
    // Create a temporary anchor element to trigger the download
    const anchor = document.createElement('a');
    anchor.href = object.src;
    anchor.download = getFileName(object.src);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  const handleDelete = () => {
    if (object.id) {
      deleteObject(object.id);
    }
  }

  if (!image || !imageLoaded) return (
    <Group>
      <Text
        x={object.x || 0}
        y={object.y || 0}
        text={"Failed to load image"}
        fontSize={16}
        fill="#ef4444"
      />
    </Group>
  );

  // Calculate button dimensions with maximum constraints
  const maxScale = 1.5; // Maximum scale factor when zooming out
  const effectiveScale = Math.min(inverseScale, maxScale);
  
  const buttonWidth = 80 * effectiveScale;
  const buttonHeight = 30 * effectiveScale;
  const buttonSpacing = 10 * effectiveScale;
  const labelFontSize = Math.min(12 * effectiveScale, 16); // Max font size of 16px
  const buttonFontSize = Math.min(12 * effectiveScale, 16); // Max font size of 16px
  
  // Calculate positions for UI elements
  const fileNameY = (object.y || 0) - 22 * effectiveScale;
  const dimensionsY = (object.y || 0) + (object.height || 0) + 12 * effectiveScale;
  const toolbarY = dimensionsY + 28 * effectiveScale;
  
  return (
    <Group>
      <Image
        ref={imageRef}
        image={image}
        x={object.x || 0}
        y={object.y || 0}
        width={object.width || 100}
        height={object.height || 100}
        stroke={object.stroke}
        strokeWidth={object.strokeWidth}
        draggable={!isMultiSelected && (object.draggable !== false)}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          updateObject(object.id, {
            x: e.target.x(),
            y: e.target.y(),
          })
        }}
        onTransformEnd={handleTransformEnd}
        id={id || object.id}
      />
      
      {isSelected && !isMultiSelected && (
        <>
          {/* File name display above image - simple text, no tooltip */}
          <Text
            x={(object.x || 0)}
            y={fileNameY}
            text={getFileName(object.src)}
            fontSize={labelFontSize}
            fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
            fontStyle="500"
            fill="#0a0a0a"
            align="left"
            scaleX={effectiveScale}
            scaleY={effectiveScale}
          />
          
          {/* Dimensions display below image */}
          <Group
            x={(object.x || 0) + ((object.width || 0) / 2)}
            y={dimensionsY}
            scaleX={effectiveScale}
            scaleY={effectiveScale}
          >
            <Rect
              width={80}
              height={22}
              cornerRadius={6} 
              fill="rgba(252, 252, 252, 0.95)" 
              stroke="rgba(0, 0, 0, 0.04)" 
              strokeWidth={1}
              offsetX={40}
              offsetY={0}
              shadowColor="rgba(0,0,0,0.08)" 
              shadowBlur={4} 
              shadowOffsetY={1}
              shadowOpacity={0.6} 
              scaleX={effectiveScale}
              scaleY={effectiveScale}
            />
            <Text
              text={`${Math.round(object.width || 0)} × ${Math.round(object.height || 0)}`}
              fontSize={labelFontSize}
              fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
              fill="rgba(0, 0, 0, 0.8)"
              align="center"
              verticalAlign="middle"
              width={80}
              height={22}
              offsetX={40}
              offsetY={0}
              scaleX={effectiveScale}
              scaleY={effectiveScale}
            />
          </Group>
          
          {/* Control toolbar - left aligned with fully rounded buttons */}
          <Group
            x={(object.x || 0)}
            y={toolbarY}
            scaleX={effectiveScale}
            scaleY={effectiveScale}
          >
            {/* Download button */}
            <Group
              onMouseEnter={() => setHoveredButton('download')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={handleDownload}
            >
              <Rect
                width={buttonWidth}
                height={buttonHeight}
                fill={hoveredButton === 'download' ? '#e0f2fe' : 'white'} 
                stroke={hoveredButton === 'download' ? '#7dd3fc' : 'rgba(0, 0, 0, 0.07)'} 
                strokeWidth={1}
                cornerRadius={buttonHeight / 2} /* Fully rounded */
                shadowColor="rgba(0,0,0,0.06)" 
                shadowBlur={5}
                shadowOffsetY={2}
                shadowOpacity={hoveredButton === 'download' ? 0.7 : 0.5}
              />
              <Text
                text="Download"
                x={0}
                y={0}
                width={buttonWidth}
                height={buttonHeight}
                align="center"
                verticalAlign="middle"
                fontSize={buttonFontSize}
                fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
                fontStyle="500"
                fill={hoveredButton === 'download' ? '#0ea5e9' : '#3f3f46'} 
              />
            </Group>
            
            {/* Delete button */}
            <Group
              x={buttonWidth + buttonSpacing}
              onMouseEnter={() => setHoveredButton('delete')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={handleDelete}
            >
              <Rect
                width={buttonWidth}
                height={buttonHeight}
                fill={hoveredButton === 'delete' ? '#fee2e2' : 'white'} 
                stroke={hoveredButton === 'delete' ? '#fca5a5' : 'rgba(0, 0, 0, 0.07)'} 
                strokeWidth={1}
                cornerRadius={buttonHeight / 2} /* Fully rounded */
                shadowColor="rgba(0,0,0,0.06)" 
                shadowBlur={5}
                shadowOffsetY={2}
                shadowOpacity={hoveredButton === 'delete' ? 0.7 : 0.5}
              />
              <Text
                text="Delete"
                x={0}
                y={0}
                width={buttonWidth}
                height={buttonHeight}
                align="center"
                verticalAlign="middle"
                fontSize={buttonFontSize}
                fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
                fontStyle="500"
                fill={hoveredButton === 'delete' ? '#ef4444' : '#3f3f46'} 
              />
            </Group>
          </Group>
          
          {isSelected && !isMultiSelected && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit minimum size
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          )}
        </>
      )}
    </Group>
  )
}

// Custom comparison function for React.memo
function arePropsEqual(prevProps: KonvaImageProps, nextProps: KonvaImageProps) {
  // Only re-render if these specific props change
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelected === nextProps.isMultiSelected &&
    prevProps.object.id === nextProps.object.id &&
    prevProps.object.x === nextProps.object.x &&
    prevProps.object.y === nextProps.object.y &&
    prevProps.object.width === nextProps.object.width &&
    prevProps.object.height === nextProps.object.height &&
    prevProps.object.src === nextProps.object.src
  );
}

// Export the memoized version of KonvaImage
export const KonvaImage = memo(KonvaImageBase, arePropsEqual);
