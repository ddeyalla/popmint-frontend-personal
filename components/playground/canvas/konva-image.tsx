"use client"

import { useEffect, useRef, useState } from "react"
import { Image, Transformer } from "react-konva"
import { type KonvaObject, useCanvasStore } from "@/store/canvasStore"

interface KonvaImageProps {
  object: KonvaObject
  isSelected: boolean
  onSelect: (e: any) => void
}

export function KonvaImage({ object, isSelected, onSelect }: KonvaImageProps) {
  const { selectedObjectId, selectObject, updateObject } = useCanvasStore()
  const imageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (!object.src) return

    const img = new window.Image()
    img.crossOrigin = "anonymous"

    // Set up event handlers before setting src
    const handleLoad = () => {
      setImage(img)
      setImageLoaded(true)
    }

    const handleError = () => {
      console.error(`Failed to load image: ${object.src}`)
      setImageLoaded(false)
    }

    img.addEventListener("load", handleLoad)
    img.addEventListener("error", handleError)

    // Now set the src to trigger loading
    img.src = object.src

    return () => {
      img.removeEventListener("load", handleLoad)
      img.removeEventListener("error", handleError)
      setImage(null)
      setImageLoaded(false)
    }
  }, [object.src])

  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      try {
        transformerRef.current.nodes([imageRef.current])
        transformerRef.current.getLayer()?.batchDraw()
      } catch (error) {
        console.error("Error updating transformer:", error)
      }
    }
  }, [isSelected])

  const handleTransformEnd = () => {
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
    } catch (error) {
      console.error("Error during transform end:", error)
    }
  }

  if (!image || !imageLoaded) return null

  return (
    <>
      <Image
        ref={imageRef}
        image={image}
        x={object.x || 0}
        y={object.y || 0}
        width={object.width || 100}
        height={object.height || 100}
        draggable={object.draggable !== false}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          updateObject(object.id, {
            x: e.target.x(),
            y: e.target.y(),
          })
        }}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox
            }
            return newBox
          }}
        />
      )}
    </>
  )
}
