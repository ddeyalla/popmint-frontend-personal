"use client";

import React from "react";
import { ModernAdGenerationFlow } from "@/components/playground/chat-panel/agent-states/ModernAdGenerationFlow";
import { Stage } from "@/lib/agent-state-mapper";

interface AdGenerationFlowBlockProps {
  currentStage: Stage;
  startTime?: Date;
  scrapedContent?: any;
  researchSummary?: string;
  adIdeas?: any[];
  generatedImages?: string[];
  currentImage?: number;
  totalImages?: number;
  imageUrl?: string;
  error?: string;
  stepTimings?: any[];
}

/**
 * This block follows the exact Frontend-flow.md progression using the new modern UI:
 * 1. User Submits URL: "Thinking..." bubble
 * 2. Job Init & SSE: Keep "Thinking..." until first 'plan' event
 * 3. Smart Plan Display: Show smart planning UI
 * 4. Research Agent: Nested sub-steps for product details and research
 * 5. Creative Strategy Agent: Nested sub-steps for concepts and ideas
 * 6. Creating Ads: Ad generation with progress
 * 7. Completion: Show success message with total time
 */
export function AdGenerationFlowBlock({
  currentStage,
  startTime,
  scrapedContent,
  researchSummary,
  adIdeas,
  generatedImages,
  currentImage,
  totalImages,
  imageUrl,
  error,
  stepTimings
}: AdGenerationFlowBlockProps) {
  return (
    <ModernAdGenerationFlow
      currentStage={currentStage}
      startTime={startTime}
      scrapedContent={scrapedContent}
      researchSummary={researchSummary}
      adIdeas={adIdeas}
      generatedImages={generatedImages}
      currentImage={currentImage}
      totalImages={totalImages}
      imageUrl={imageUrl}
      error={error}
      stepTimings={stepTimings}
    />
  );
} 