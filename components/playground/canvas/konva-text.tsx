"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Text, Transformer } from "react-konva"
import { type KonvaObject, useCanvasStore } from "@/store/canvasStore"

interface KonvaTextProps {
  object: KonvaObject
  isSelected: boolean
  onSelect: (e: any) => void
  id?: string
  isMultiSelected?: boolean
}

export function KonvaText({ object, isSelected, onSelect, id, isMultiSelected }: KonvaTextProps) {
  const { updateObject } = useCanvasStore()
  const textRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [textValue, setTextValue] = useState(object.text || "")
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setTextValue(object.text || "")
  }, [object.text])

  useEffect(() => {
    if (isSelected && !isMultiSelected && transformerRef.current && textRef.current) {
      try {
        transformerRef.current.nodes([textRef.current])
        transformerRef.current.getLayer()?.batchDraw()
      } catch (error) {
        console.error("Error updating text transformer:", error)
      }
    }
  }, [isSelected, isMultiSelected])

  const handleDblClick = () => {
    if (!textRef.current) return

    try {
      const position = textRef.current.getAbsolutePosition() || { x: object.x || 0, y: object.y || 0 }
      setTextPosition(position)
      setIsEditing(true)
    } catch (error) {
      console.error("Error handling double click:", error)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value)
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      finishEditing()
    }
    if (e.key === "Escape") {
      setTextValue(object.text || "")
      finishEditing()
    }
  }

  const finishEditing = () => {
    setIsEditing(false)
    updateObject(object.id, { text: textValue })
  }

  const handleTransformEnd = () => {
    if (!textRef.current) return

    try {
      const node = textRef.current
      updateObject(object.id, {
        x: node.x(),
        y: node.y(),
        fontSize: Math.max(1, (object.fontSize || 16) * node.scaleX()),
      })

      // Reset scale to avoid double scaling
      node.scaleX(1)
      node.scaleY(1)
    } catch (error) {
      console.error("Error during text transform end:", error)
    }
  }

  return (
    <>
      <Text
        ref={textRef}
        x={object.x || 0}
        y={object.y || 0}
        text={textValue}
        fontSize={object.fontSize || 16}
        fontFamily={object.fontFamily || "Arial"}
        fill={object.fill || "#000000"}
        draggable={!isMultiSelected && (object.draggable !== false)}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragEnd={(e) => {
          updateObject(object.id, {
            x: e.target.x(),
            y: e.target.y(),
          })
        }}
        onTransformEnd={handleTransformEnd}
        id={id || object.id}
      />
      {isEditing && (
        <div
          style={{
            position: "absolute",
            top: textPosition.y + "px",
            left: textPosition.x + "px",
            zIndex: 1000,
          }}
        >
          <textarea
            value={textValue}
            onChange={handleTextChange}
            onKeyDown={handleTextareaKeyDown}
            onBlur={finishEditing}
            autoFocus
            style={{
              width: Math.max(100, textRef.current?.width() || 100) + "px",
              height: Math.max(50, textRef.current?.height() || 50) + "px",
              fontSize: (object.fontSize || 16) + "px",
              fontFamily: object.fontFamily || "Arial",
              color: object.fill || "#000000",
              border: "1px solid black",
              padding: "5px",
              margin: 0,
              overflow: "hidden",
              background: "white",
              outline: "none",
              resize: "none",
            }}
          />
        </div>
      )}
    </>
  )
}
