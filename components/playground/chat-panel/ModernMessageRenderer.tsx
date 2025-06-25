"use client";

import React, { useEffect, useState } from "react";
import { ChatMessage } from "@/store/chatStore";
import { MessageBubble } from "./message-bubble";
import { ModernAgentBubble, ResearchOutputBubble, AdConceptBubble } from "./agent-bubbles/ModernAgentBubble";
import { TemporaryStatusBubble } from "./agent-bubbles";
import { AlertTriangle, Copy, Lightbulb, Brain } from "lucide-react";
import { motion } from 'framer-motion';
import { bubbleVariants } from '@/lib/motion-variants';
import { cn } from "@/lib/utils";
import { formatJsonData, isConceptData, extractConcepts } from '@/lib/format-utils';

interface ModernMessageRendererProps {
  message: ChatMessage;
}

// Copy to clipboard function
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    const { playCopySuccess } = await import('@/lib/playSFX');
    playCopySuccess();
  } catch (err) {
    console.error('Failed to copy text: ', err);
    const { playError } = await import('@/lib/playSFX');
    playError();
  }
};

export function ModernMessageRenderer({ message }: ModernMessageRendererProps) {
  const [expandedResearch, setExpandedResearch] = useState(false);

  // Handle research output messages
  const isResearchOutput = (msg: ChatMessage): boolean => {
    return msg.type === 'agent_output' &&
           (msg.content.includes('research') ||
            msg.content.includes('Research') ||
            msg.content.includes('insights') ||
            msg.content.includes('analysis'));
  };

  // Handle ad concept messages
  const isAdConceptMessage = (msg: ChatMessage): boolean => {
    return msg.type === 'agent_output' && isConceptData(msg.content);
  };

  // Render based on message type
  switch (message.type) {
    case 'text':
      return <MessageBubble message={message} />;

    case 'agent_bubble':
      return <ModernAgentBubble message={message} />;

    case 'temporary_status':
      return <TemporaryStatusBubble message={message} />;

    case 'agent_output':
      // Handle research output
      if (isResearchOutput(message)) {
        return (
          <ResearchOutputBubble
            content={message.content}
            isExpanded={expandedResearch}
            onToggleExpand={() => setExpandedResearch(!expandedResearch)}
          />
        );
      }

      // Handle ad concepts - split into individual bubbles
      if (isAdConceptMessage(message)) {
        const concepts = extractConcepts(message.content);

        return (
          <div className="space-y-4">
            {concepts.map((concept, index) => (
              <AdConceptBubble
                key={`concept-${index}`}
                concept={concept}
                index={index}
              />
            ))}
          </div>
        );
      }

      // Handle other agent outputs
      const isGeneratedCopy = message.content.includes('copy') || message.content.includes('CTA');
      const outputIcon = isGeneratedCopy ? Lightbulb : Brain;
      const outputLabel = isGeneratedCopy ? '💡 Generated Copy' : '🧠 Ad Output';

      return (
        <motion.div
          variants={bubbleVariants.ai}
          initial="hidden"
          animate="show"
          className="flex w-full justify-start overflow-x-visible mb-6"
        >
          <div className="max-w-lg">
            <div className="rounded-[15px] px-4 py-3 bg-chat-bg-ai border border-[#EFEFEF] shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                {React.createElement(outputIcon, { className: "w-4 h-4 text-chat-text-accent" })}
                <span className="font-medium text-chat-text-primary text-sm">{outputLabel}</span>
              </div>

              {/* Content */}
              <div className="space-y-2">
                {message.content.split('\n').filter(line => line.trim()).map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg text-sm leading-relaxed",
                      index % 2 === 0 ? "bg-white" : "bg-chat-bg-secondary",
                      "border border-[#EFEFEF]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1 whitespace-pre-wrap break-words text-chat-text-secondary">
                        {line}
                      </span>
                      {line.length > 20 && (
                        <button
                          onClick={() => copyToClipboard(line)}
                          className="flex-shrink-0 p-1 hover:bg-chat-bg-secondary rounded transition-colors"
                          title="Copy text"
                        >
                          <Copy className="w-3 h-3 text-chat-text-muted" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Image display */}
              {message.imageUrls && message.imageUrls.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-chat-text-primary text-sm">🖼 Generated Visuals</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {message.imageUrls.map((url, index) => (
                      <div
                        key={index}
                        className="rounded-[15px] border border-[#EFEFEF] shadow-sm hover:scale-105 hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        <img
                          src={url}
                          alt={`Generated image ${index + 1}`}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      );

    case 'error':
      return (
        <motion.div
          variants={bubbleVariants.ai}
          initial="hidden"
          animate="show"
          className="flex w-full justify-start overflow-x-visible mb-4"
        >
          <div className="max-w-lg">
            <div className="rounded-[15px] px-4 py-3 bg-chat-bg-error border border-[#EFEFEF] shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-chat-text-error" />
                <span className="text-chat-text-error font-medium text-sm">Error</span>
              </div>
              <div className="mt-2 text-sm text-red-700 leading-relaxed">
                {message.content}
              </div>
            </div>
          </div>
        </motion.div>
      );

    default:
      // Fallback to original MessageBubble
      return <MessageBubble message={message} />;
  }
}
