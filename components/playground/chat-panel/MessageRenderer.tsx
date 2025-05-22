"use client";

import React from "react";
import { ChatMessage, AdGenerationStage } from "@/store/chatStore";
import { AdGenerationFlowBlock } from "./blocks/AdGenerationFlowBlock";
import { MessageBubble } from "./message-bubble";
import { Stage } from "@/lib/agent-state-mapper";

interface MessageRendererProps {
  message: ChatMessage;
}

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

    case 'ad_generation':
      return (
        <div className="flex w-full justify-start">
          <div className="max-w-[90%]">
            <AdGenerationFlowBlock
              currentStage={mapAdGenerationStageToStage(message.adData?.stage || 'thinking')}
              startTime={message.adData?.startTime}
              scrapedContent={message.adData?.scrapedContent}
              researchSummary={message.adData?.researchSummary}
              adIdeas={message.adData?.adIdeas}
              generatedImages={message.adData?.generatedImages}
              error={message.adData?.error}
            />
          </div>
        </div>
      );

    case 'ad_step_complete':
      const stepTiming = message.adData?.stepTimings?.[message.adData.stepTimings.length - 1];
      const duration = stepTiming?.duration ? `${(stepTiming.duration / 1000).toFixed(1)}s` : '';
      
      return (
        <div className="flex w-full justify-start">
          <div className="flex items-center gap-2 p-2">
            <span className="text-green-700">{message.content}</span>
            {duration && (
              <span className="text-green-500 text-sm">
                {duration}
              </span>
            )}
          </div>
        </div>
      );

    case 'agent_progress':
      return (
        <div className="flex w-full justify-start">
          <div className="flex items-center gap-2 p-2">
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
      return (
        <div className="flex w-full justify-start">
          <div className="max-w-[80%] p-3 rounded-lg bg-green-50 text-green-700">
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            {message.imageUrls && message.imageUrls.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {message.imageUrls.map((url, index) => (
                  <img 
                    key={index}
                    src={url}
                    alt={`Generated image ${index + 1}`}
                    className="rounded-md max-h-48 w-auto object-contain"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      );

    case 'error':
      return (
        <div className="flex w-full justify-start">
          <div className="max-w-[80%] p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <span>{message.content}</span>
            </div>
          </div>
        </div>
      );

    default:
      // Fallback to MessageBubble for unknown types
      return <MessageBubble message={message} />;
  }
}