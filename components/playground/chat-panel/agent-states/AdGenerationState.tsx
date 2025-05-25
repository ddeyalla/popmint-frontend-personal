"use client";

import React, { useState } from "react";
import { Heart, Sparkles, CheckCircle, Loader2, Search, Lightbulb, Wand2, AlertCircle, Clock, CircleCheck } from "lucide-react";
import { Stage, getSmartPlanningSteps, calculateDuration } from "@/lib/agent-state-mapper";
import { SmartPlanningState } from "./SmartPlanningState";

interface AdGenerationStateProps {
  currentStage: Stage;
  startTime?: Date;
  scrapedContent?: string;
  researchSummary?: string;
  adIdeas?: any[];
  generatedImages?: string[];
  currentImage?: number;
  totalImages?: number;
  imageUrl?: string;
  error?: string;
}

// Simple stage component for loading states
function StageLoader({
  icon: Icon,
  title,
  message,
  bgColor = "bg-blue-50",
  borderColor = "border-[blue-200]",
  textColor = "text-blue-800",
  iconColor = "text-blue-500"
}: {
  icon: any;
  title: string;
  message: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  iconColor?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 w-full p-3 rounded-[10px] ${bgColor} border ${borderColor}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className={`font-normal ${textColor}`}>{title}</span>
        <Loader2 className={`h-4 w-4 ${iconColor} animate-spin ml-auto`} />
      </div>
      <div className={`text-sm ${textColor} italic flex items-center gap-1`}>
        <span className="animate-bounce" style={{ animationDelay: '0.0s' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
      </div>
    </div>
  );
}

// Component for completed stages with data
function CompletedStage({
  icon: Icon,
  title,
  children,
  bgColor = "bg-blue-50",
  borderColor = "border-blue-200",
  textColor = "text-blue-800",
  iconColor = "text-blue-500"
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  iconColor?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 w-full p-3 rounded-[10px] ${bgColor} border ${borderColor}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className={`font-normal ${textColor}`}>{title}</span>
        <CircleCheck className="h-4 w-4 text-green-500 ml-auto" />
      </div>
      {children}
    </div>
  );
}

export function AdGenerationState({
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
}: AdGenerationStateProps) {
  const [expandedResearch, setExpandedResearch] = useState(false);

  // Handle initial thinking state
  if (!currentStage) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-3 px-3 self-start">
        <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
        <span className="font-normal text-slate-600">thinking</span>
        <span className="animate-bounce" style={{ animationDelay: '0.0s' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
      </div>
    );
  }

  // Handle smart planning display
  if (currentStage === "plan") {
    const steps = getSmartPlanningSteps(currentStage);
    return <SmartPlanningState steps={steps} />;
  }

  // Handle error state
  if (currentStage === "error") {
    return (
      <div className="flex flex-col gap-2 w-full p-4 rounded-[10px] bg-red-50 border border-red-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="font-normal text-red-800">Error</span>
        </div>
        <p className="text-red-700 text-sm">
          {error || "An error occurred during ad generation"}
        </p>
      </div>
    );
  }

  // Handle completion state
  if (currentStage === "done") {
    const duration = startTime ? calculateDuration(startTime, new Date()) : "";
    return (
      <div className="flex flex-col gap-2 w-full p-4 rounded-[10px] bg-green-50 border border-green-200 overflow-hidden">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-normal text-green-800">All ads generated successfully!</span>
        </div>
        {duration && (
          <div className="text-sm text-gray-600 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Completed in {duration}</span>
          </div>
        )}
        {generatedImages && generatedImages.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {generatedImages.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt={`Generated ad ${index + 1}`}
                className="rounded-[10px] w-full h-auto object-contain border border-gray-200"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Determine stage progression
  const stageOrder: Stage[] = [
    "plan", "page_scrape_started", "page_scrape_done",
    "research_started", "research_done", "concepts_started", "concepts_done",
    "ideas_started", "ideas_done", "images_started", "image_generation_progress", "images_done", "done"
  ];

  const currentStageIndex = stageOrder.indexOf(currentStage);
  const hasReached = (stage: Stage) => {
    const stageIndex = stageOrder.indexOf(stage);
    return stageIndex !== -1 && stageIndex <= currentStageIndex;
  };

  // Progressive UI display
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Smart Planning - always show after plan */}
      <SmartPlanningState steps={getSmartPlanningSteps(currentStage)} />

      {/* Product Details Stage */}
      {hasReached("page_scrape_started") && (
        <>
          {currentStage === "page_scrape_started" ? (
            <StageLoader
              icon={Search}
              title="Checking product details"
              message="Analyzing product page..."
            />
          ) : (
            <CompletedStage
              icon={Search}
              title="Product details extracted"
            >
              {scrapedContent && (
                <div className="mt-2 p-2 bg-white rounded border text-sm text-gray-700">
                  <div className="max-h-32 overflow-y-auto">
                    {JSON.stringify(scrapedContent, null, 2)}
                  </div>
                </div>
              )}
            </CompletedStage>
          )}
        </>
      )}

      {/* Research Stage */}
      {hasReached("research_started") && (
        <>
          {currentStage === "research_started" ? (
            <StageLoader
              icon={Search}
              title="Researching product"
              message="Gathering insights..."
              bgColor="bg-indigo-50"
              borderColor="border-indigo-200"
              textColor="text-indigo-800"
              iconColor="text-indigo-500"
            />
          ) : (
            <CompletedStage
              icon={Search}
              title="Research completed"
              bgColor="bg-transparent"
              borderColor="border-transparent"
              textColor="text-indigo-800"
              iconColor="text-indigo-500"
            >
              {researchSummary && (
                <div className="mt-2">
                  <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                    <div className="max-h-32 overflow-y-auto">
                      {expandedResearch ? researchSummary : researchSummary.substring(0, 300)}
                      {!expandedResearch && researchSummary.length > 300 && "..."}
                    </div>
                    {researchSummary.length > 300 && (
                      <button
                        className="text-indigo-600 text-xs mt-1 underline"
                        onClick={() => setExpandedResearch(!expandedResearch)}
                      >
                        {expandedResearch ? "Show less" : "View full research"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CompletedStage>
          )}
        </>
      )}

      {/* Concepts Stage */}
      {hasReached("concepts_started") && (
        <>
          {currentStage === "concepts_started" ? (
            <StageLoader
              icon={Lightbulb}
              title="Generating ad concepts"
              message="Creating campaign ideas..."
              bgColor="bg-purple-50"
              borderColor="border-purple-200"
              textColor="text-purple-800"
              iconColor="text-purple-500"
            />
          ) : (
            <CompletedStage
              icon={Lightbulb}
              title="Ad concepts generated"
              bgColor="bg-purple-50"
              borderColor="border-purple-200"
              textColor="text-purple-800"
              iconColor="text-purple-500"
            >
              <div className="text-sm text-green-600 font-normal">
                ✓ Moving to next step...
              </div>
            </CompletedStage>
          )}
        </>
      )}

      {/* Ideas Stage */}
      {hasReached("ideas_started") && (
        <>
          {currentStage === "ideas_started" ? (
            <StageLoader
              icon={Wand2}
              title="Generating ad copy ideas"
              message="Writing compelling copy..."
              bgColor="bg-amber-50"
              borderColor="border-amber-200"
              textColor="text-amber-800"
              iconColor="text-amber-500"
            />
          ) : (
            <CompletedStage
              icon={Wand2}
              title="Ad copy ideas generated"
              bgColor="bg-amber-50"
              borderColor="border-amber-200"
              textColor="text-amber-800"
              iconColor="text-amber-500"
            >
              {adIdeas && adIdeas.length > 0 && (
                <div className="mt-2 space-y-2">
                  {adIdeas.map((idea, index) => (
                    <div key={index} className="p-2 bg-white rounded border text-sm">
                      <div className="font-normal text-gray-800">
                        {idea.title || `Ad Idea ${index + 1}`}
                      </div>
                      {idea.headline && (
                        <div className="text-gray-600 mt-1">{idea.headline}</div>
                      )}
                      {idea.body_text && (
                        <div className="text-gray-500 mt-1 text-xs">{idea.body_text}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CompletedStage>
          )}
        </>
      )}

      {/* Images Stage */}
      {hasReached("images_started") && (
        <div className="flex flex-col gap-2 w-full p-3 rounded-[10px] bg-pink-50 border border-pink-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink-500" />
            <span className="font-normal text-pink-800">Generating ads</span>
            {(currentStage === "images_started" || currentStage === "image_generation_progress") && (
              <Loader2 className="h-4 w-4 text-pink-500 animate-spin ml-auto" />
            )}
            {hasReached("images_done") && currentStage !== "images_started" && currentStage !== "image_generation_progress" && (
              <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
            )}
          </div>

          {currentStage === "images_started" && (
            <div className="text-sm text-pink-700 italic flex items-center gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0.0s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
            </div>
          )}

          {currentStage === "image_generation_progress" && currentImage && totalImages && (
            <div className="flex flex-col gap-2">
              <div className="text-sm text-pink-700">
                Generating ad image {currentImage} of {totalImages}...
              </div>
              {imageUrl && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt={`Generated image ${currentImage}`}
                    className="rounded-[10px] max-h-[150px] w-auto object-contain border border-gray-200"
                  />
                </div>
              )}
            </div>
          )}

          {hasReached("images_done") && currentStage !== "images_started" && currentStage !== "image_generation_progress" && (
            <div className="text-sm text-green-600 font-normal">
              ✓ Ads generated.
            </div>
          )}

          {generatedImages && generatedImages.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {generatedImages.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`Generated ad ${index + 1}`}
                  className="rounded-[10px] w-full h-auto object-contain border border-gray-200"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}