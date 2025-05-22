"use client";

import React from "react";
import { AdGenerationState } from "@/components/playground/chat-panel/agent-states/AdGenerationState";
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
}

/**
 * This block follows the exact Frontend-flow.md progression:
 * 1. User Submits URL: "Thinking..." bubble
 * 2. Job Init & SSE: Keep "Thinking..." until first 'plan' event
 * 3. Smart Plan Display: Show smart planning UI
 * 4. Checking Product Details: "Checking product details..." on page_scrape_started, show scraped content on page_scrape_done
 * 5. Researching Product: "Researching..." on research_started, show summary on research_done (first 300 chars + expandable)
 * 6. Generating Ad Concepts: "Generating ad concepts..." on concepts_started, move to next on concepts_done (no data rendering)
 * 7. Generating Ad Copy Ideas: "Generating ad copy ideas..." on ideas_started, show all ideas on ideas_done
 * 8. Generating Ads: "Generating ads..." on images_started, update progress on image_generation_progress, show final on images_done
 * 9. Completion: Show success message with total time on 'done'
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
  error
}: AdGenerationFlowBlockProps) {
  return (
    <AdGenerationState
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
    />
  );
} 