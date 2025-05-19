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
  onTransformEnd?: (e: any) => void
}

export function KonvaText({ object, isSelected, onSelect, id, isMultiSelected, onTransformEnd }: KonvaTextProps) {
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
    if (!textRef.current) return;

    const stage = textRef.current.getStage();
    if (!stage) return;

    // Hide the text node
    textRef.current.hide();
    
    // Create a textarea element
    const textPosition = textRef.current.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y
    };

    // Create textarea over canvas
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.value = textValue;
    textarea.style.position = 'absolute';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';
    textarea.style.width = textRef.current.width() * stage.scaleX() + 'px';
    textarea.style.height = textRef.current.height() * stage.scaleY() + 'px';
    textarea.style.fontSize = textRef.current.fontSize() * stage.scaleX() + 'px';
    textarea.style.border = 'none';
    textarea.style.padding = '0px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = textRef.current.lineHeight();
    textarea.style.fontFamily = textRef.current.fontFamily();
    textarea.style.transformOrigin = 'left top';
    textarea.style.textAlign = textRef.current.align();
    textarea.style.color = textRef.current.fill();
    
    let transform = '';
    const px = 0;
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    const rotation = textRef.current.rotation();
    if (rotation) {
      transform += 'rotateZ(' + rotation + 'deg)';
    }
    let scaleX = textRef.current.scaleX();
    let scaleY = textRef.current.scaleY();
    if (scaleX !== 1 || scaleY !== 1) {
      transform += ' scale(' + scaleX + ',' + scaleY + ')';
    }
    textarea.style.transform = transform;
    textarea.style.transformOrigin = 'left top';
    textarea.focus();

    function removeTextarea() {
      textarea.parentNode?.removeChild(textarea);
      window.removeEventListener('click', handleOutsideClick);
      textRef.current?.show();
      stage.batchDraw();
    }

    function handleOutsideClick(e: MouseEvent) {
      if (e.target !== textarea) {
        finishEditing();
      }
    }

    setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
    });

    textarea.addEventListener('keydown', function (e) {
      // hide on enter but not on shift + enter
      if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        finishEditing();
      }
      // on esc
      if (e.keyCode === 27) {
        removeTextarea();
      }
    });

    textarea.addEventListener('input', function () {
      const scale = textRef.current?.getAbsoluteScale().x || 1;
      // For some reason, in Firefox textarea width is limited
      const width = isFirefox ? textarea.offsetWidth : textarea.scrollWidth;
      const height = textarea.scrollHeight;
      textarea.style.width = width + 'px';
      textarea.style.height = height + 'px';
      setTextValue(textarea.value);
    });

    function finishEditing() {
      const newText = textarea.value;
      removeTextarea();
      setTextValue(newText);
      updateObject(object.id, { text: newText });
    }
  };

  const handleTransformEnd = (e: any) => {
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

      // Call external handler if provided
      onTransformEnd?.(e)
    } catch (error) {
      console.error("Error during text transform end:", error)
    }
  }

  return (
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
  )
}
