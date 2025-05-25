"use client";

import React from "react";
import { ChatMessage, AdGenerationStage } from "@/store/chatStore";
import { AdGenerationFlowBlock } from "./blocks/AdGenerationFlowBlock";
import { MessageBubble } from "./message-bubble";
import { Stage } from "@/lib/agent-state-mapper";
import { AgentBubble, TemporaryStatusBubble } from "./agent-bubbles";
import { AlertTriangle, Copy, Lightbulb, Brain } from "lucide-react";
import { motion } from 'framer-motion';
import { bubbleVariants } from '@/lib/motion-variants';
import { cn } from "@/lib/utils";

interface MessageRendererProps {
  message: ChatMessage;
}

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

// Map simplified AdGenerationStage to detailed Stage
function mapAdGenerationStageToStage(adStage: AdGenerationStage): Stage {
  switch (adStage) {
    case 'thinking':
      return 'plan';
    case 'planning':
      return 'plan';
    case 'scraping':
      return 'page_scrape_started';
    case 'researching':
      return 'research_started';
    case 'concepting':
      return 'concepts_started';
    case 'ideating':
      return 'ideas_started';
    case 'imaging':
      return 'images_started';
    case 'completed':
      return 'done';
    case 'error':
      return 'error';
    default:
      return 'plan';
  }
}

export function MessageRenderer({ message }: MessageRendererProps) {
  switch (message.type) {
    case 'text':
      // Use the MessageBubble component for simple text messages
      return <MessageBubble message={message} />;

    case 'agent_bubble':
      // Use the new AgentBubble component for specialized agent bubbles
      return <AgentBubble message={message} />;

    case 'temporary_status':
      // Use the TemporaryStatusBubble for temporary status messages
      return <TemporaryStatusBubble message={message} />;

    case 'ad_generation':
      return (
        <div className="flex w-full justify-start overflow-x-visible">
          <div className="max-w-[85%] break-words">
            <AdGenerationFlowBlock
              currentStage={mapAdGenerationStageToStage(message.adData?.stage || 'thinking')}
              startTime={message.adData?.startTime}
              scrapedContent={message.adData?.scrapedContent}
              researchSummary={message.adData?.researchSummary}
              adIdeas={message.adData?.adIdeas}
              generatedImages={message.adData?.generatedImages}
              error={message.adData?.error}
              stepTimings={message.adData?.stepTimings}
            />
          </div>
        </div>
      );

    case 'ad_step_complete':
      // Don't render individual step completion messages anymore
      // as they are now integrated into the main flow
      return null;

    case 'agent_progress':
      return (
        <div className="flex w-full justify-start overflow-x-visible">
          <div className="flex items-center gap-2 p-2 max-w-[85%] break-words">
            <img
              src="/popmint_logo.svg"
              alt="PopMint"
              className="w-4 h-4 animate-spin"
            />
            <span className="text-gray-700">{message.content}</span>
          </div>
        </div>
      );

    case 'agent_output':
      // Determine if this is generated copy or ad concept
      const isGeneratedCopy = message.content.includes('copy') || message.content.includes('CTA');
      const outputIcon = isGeneratedCopy ? Lightbulb : Brain;
      const outputLabel = isGeneratedCopy ? '💡 Generated Copy' : '🧠 Ad Concept';

      return (
        <motion.div
          variants={bubbleVariants.ai}
          initial="hidden"
          animate="show"
          className="flex w-full justify-start overflow-x-visible mb-6"
        >
          <div className="max-w-lg p-4 rounded-[15px] bg-pm-emerald/10 border border-[#EFEFEF] break-words"> {/* max-w-lg, p-4 as specified */}
            {/* Header with icon and label */}
            <div className="flex items-center gap-2 mb-3">
{React.createElement(outputIcon, { className: "w-4 h-4 text-pm-emerald" })}
              <span className="font-medium text-pm-emerald text-sm">{outputLabel}</span>
            </div>

            {/* Content with alternating backgrounds */}
            <div className="space-y-2">
              {message.content.split('\n').filter(line => line.trim()).map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-md text-sm leading-relaxed",
                    index % 2 === 0 ? "bg-white" : "bg-zinc-50", // Alternating backgrounds as specified
                    "border-b border-zinc-100 last:border-b-0" // divide-y effect
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex-1 whitespace-pre-wrap break-words">{line}</span>
                    {line.length > 20 && ( // Only show copy button for substantial content
                      <button
                        onClick={() => copyToClipboard(line)}
                        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy text"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Image display with enhanced styling */}
            {message.imageUrls && message.imageUrls.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium text-gray-700 text-sm">🖼 Final Visuals</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {message.imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="thumbnail rounded-md border border-zinc-100 shadow-sm hover:scale-105 hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Generated image ${index + 1}`}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ))}
                </div>
                {/* Optional regenerate button */}
                <button className="mt-3 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                  Regenerate images
                </button>
              </div>
            )}
          </div>
        </motion.div>
      );

    case 'error':
      return (
        <div className="flex w-full justify-start overflow-x-visible">
          <div className="max-w-[85%] p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 break-words">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="break-words">{message.content}</span>
            </div>
          </div>
        </div>
      );

    default:
      // Fallback to MessageBubble for unknown types
      return <MessageBubble message={message} />;
  }
}