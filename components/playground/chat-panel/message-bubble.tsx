"use client";

import React, { useState, useRef } from "react";
import type { ChatMessage } from "@/store/chatStore";
import { User, ChevronDown, ChevronUp, Copy } from "lucide-react";
import Image from "next/image"; // Using next/image for optimization
import { cn } from "@/lib/utils";
import { renderLucideIcon } from "@/lib/icon-utils";
import { formatJsonData, cleanString, truncateText, isConceptData, extractConcepts } from '@/lib/format-utils';
import { motion } from 'framer-motion';
import { bubbleVariants } from '@/lib/motion-variants';

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * MessageBubble component for displaying simple text messages.
 * Used for basic user/assistant text interactions.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, timestamp, imageUrls, icon } = message;
  const isUserMessage = role === "user";
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Play success sound
      const { playCopySuccess } = await import('@/lib/playSFX');
      playCopySuccess();
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Play error sound
      const { playError } = await import('@/lib/playSFX');
      playError();
    }
  };

  // Handle expanding content with smooth scroll
  const handleExpandToggle = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    // If expanding, scroll to show the newly revealed content after a short delay
    if (newExpandedState && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
    }
  };

  // Check if content might be JSON
  let formattedContent = content;
  let isJsonContent = false;
  let parsedContent = null;

  try {
    // Check if content is JSON
    if (content && (content.startsWith('{') || content.startsWith('['))) {
      parsedContent = JSON.parse(content);
      isJsonContent = true;

      // Check if it's concept data
      if (isConceptData(parsedContent)) {
        // We'll handle concepts separately in the render
        formattedContent = content;
      } else {
        // Format other JSON data
        formattedContent = formatJsonData(parsedContent);
      }
    }
  } catch (e) {
    // Not valid JSON, use as is
    formattedContent = cleanString(content);
    isJsonContent = false;
  }

  // Extract concepts if present
  let concepts = [];
  if (isJsonContent && parsedContent) {
    try {
      concepts = extractConcepts(parsedContent);
    } catch (e) {
      console.error('Error extracting concepts:', e);
    }
  }
  const hasConcepts = concepts.length > 0;

  // Truncate text for display
  const truncatedContent = formattedContent.length > 300
    ? truncateText(formattedContent, 300)
    : formattedContent;

  // Determine avatar based on message role
  const avatar = isUserMessage ? (
    <div className="w-6 h-6 rounded-[10px] bg-pm-indigo flex items-center justify-center flex-shrink-0">
      <User className="h-4 w-4 text-white" />
    </div>
  ) : (
    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      {icon && icon !== 'Bot' ?
        renderLucideIcon(icon, { size: 16, className: "text-gray-600" }) :
        renderLucideIcon('PopMintLogo', { size: 16 })
      }
    </div>
  );

  return (
    <motion.div
      variants={bubbleVariants[isUserMessage ? 'user' : 'ai']}
      initial="hidden"
      animate="show"
      className={cn(
        "flex w-full overflow-x-visible mb-6", // 24px vertical gap as specified
        isUserMessage ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex gap-2",
          isUserMessage ? "flex-row-reverse max-w-lg" : "flex-row max-w-lg" // max-w-lg as specified
        )}
      >
        {/* Avatar */}
        <div className="mt-1">{avatar}</div>

        {/* Message Content Area */}
        <div
          className={cn(
            "rounded-[15px] px-4 py-3 text-[14px] break-words shadow-sm border border-[#EFEFEF]", // px-4 py-3 as specified
            isUserMessage
              ? "bg-pm-bubble-user text-slate-900" // Use new design token
              : "bg-pm-bubble-ai text-slate-800" // Use new design token
          )}
        >
          {/* Main text content */}
          {hasConcepts ? (
            // Display concepts in separate bubbles
            <div className="space-y-4">
              {concepts.map((concept, index) => (
                <div key={index} className="bg-white/90 rounded-[15px] p-3 shadow-sm border border-[#EFEFEF]">
                  {/* Concept name/title */}
                  {concept.concept_name && (
                    <h3 className="font-medium text-sm mb-2 text-blue-600">{concept.concept_name}</h3>
                  )}

                  {/* Title */}
                  {concept.title && (
                    <h4 className="text-sm mb-2 font-semibold">{concept.title}</h4>
                  )}

                  {/* Headline */}
                  {concept.headline && (
                    <div className="text-sm mb-2 italic font-medium">{concept.headline}</div>
                  )}

                  {/* Body text with truncation */}
                  {concept.body_text && (
                    <div className="text-sm mb-2">
                      <p className="font-medium text-xs text-gray-700 mb-1">Body Text:</p>
                      <p>{concept.body_text.length > 300 && !isExpanded
                        ? truncateText(concept.body_text, 300)
                        : concept.body_text}
                      </p>

                      {concept.body_text.length > 300 && (
                        <button
                          onClick={handleExpandToggle}
                          className="text-xs text-blue-500 mt-1 flex items-center"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                          {isExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Ad description with truncation */}
                  {concept.ad_description && (
                    <div className="text-sm mb-2 text-gray-600">
                      <p className="font-medium text-xs text-gray-700 mb-1">Description:</p>
                      <p>{concept.ad_description.length > 300 && !isExpanded
                        ? truncateText(concept.ad_description, 300)
                        : concept.ad_description}
                      </p>

                      {concept.ad_description.length > 300 && (
                        <button
                          onClick={handleExpandToggle}
                          className="text-xs text-blue-500 mt-1 flex items-center"
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                          {isExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  {concept.cta && (
                    <div className="flex items-center justify-between mt-2 p-2 bg-blue-50 rounded-md">
                      <span className="text-sm text-blue-600 font-medium flex-1 text-center">
                        {concept.cta}
                      </span>
                      <button
                        onClick={() => copyToClipboard(concept.cta)}
                        className="ml-2 p-1 hover:bg-blue-100 rounded transition-colors"
                        title="Copy CTA"
                      >
                        <Copy className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : isJsonContent ? (
            // Display formatted JSON data
            <div ref={contentRef} className="whitespace-pre-wrap break-words leading-relaxed">
              {isExpanded ? formattedContent : truncatedContent}

              {formattedContent.length > 300 && (
                <button
                  onClick={handleExpandToggle}
                  className="text-xs text-blue-500 mt-2 flex items-center"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                  {isExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                </button>
              )}
            </div>
          ) : (
            // Display regular text content
            <p className="whitespace-pre-wrap break-words leading-relaxed">{formattedContent}</p>
          )}

          {/* Image display */}
          {imageUrls && imageUrls.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {imageUrls.map((url: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-[15px] shadow-sm hover:shadow-md transition-shadow duration-200 border border-[#EFEFEF]"
                  onClick={() => {
                    // Import from canvasStore to avoid circular dependencies
                    const { addImage } = require('@/store/canvasStore').useCanvasStore.getState();

                    // Add the image to the canvas when clicked
                    const x = 20 + index * (512 + 40);
                    const y = 20;
                    addImage(url, x, y, true); // Mark as generated image
                  }}
                >
                  <Image
                    src={url}
                    alt={`Generated image ${index + 1}`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                    onError={() => {
                      console.error(`Error loading image: ${url}`);
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                    <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium bg-black bg-opacity-50 px-2 py-1 rounded-full">
                      Click to add to canvas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p
            className={cn(
              "text-xs mt-1.5",
              isUserMessage ? "text-slate-500 opacity-80" : "text-slate-400"
            )}
          >
            {timestamp ? new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) : 'Now'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
