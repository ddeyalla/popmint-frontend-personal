"use client";

import React, { useState, useEffect } from "react";
import { 
  Brain, 
  Sparkles, 
  Image as ImageIcon, 
  Search, 
  CircleCheck, 
  ChevronDown,
  Clock,
  Heart
} from "lucide-react";
import { Stage } from "@/lib/agent-state-mapper";
import { cn } from "@/lib/utils";

interface StepTiming {
  stage: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

interface ModernAdGenerationFlowProps {
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
  stepTimings?: StepTiming[];
}

interface AnimatedDotsProps {
  color?: string;
}

function AnimatedDots({ color = "text-gray-400" }: AnimatedDotsProps) {
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <span className="animate-bounce" style={{ animationDelay: '0.0s' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
    </div>
  );
}

interface StepBubbleProps {
  title: string;
  icon: React.ReactNode;
  gradient: string;
  isActive: boolean;
  isCompleted: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  duration?: string;
}

function StepBubble({ 
  title, 
  icon, 
  gradient, 
  isActive, 
  isCompleted,
  isExpanded,
  onToggle,
  children,
  duration
}: StepBubbleProps) {
  return (
    <div className={cn(
      "rounded-[10px] p-2 transition-all duration-300",
      gradient,
      isActive && "shadow-lg",
      isCompleted && "shadow-sm"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-[10px] bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {icon}
          </div>
          <span className="font-medium text-gray-900">{title}</span>
          {isActive && <AnimatedDots />}
          {isCompleted && <CircleCheck className="w-4 h-4 text-green-600" />}
          {duration && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </span>
          )}
        </div>
        {children && (
          <button 
            onClick={onToggle}
            className="p-1 hover:bg-white/10 rounded-[10px] transition-colors"
          >
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-600 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </button>
        )}
      </div>
      
      {children && isExpanded && (
        <div className="mt-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface NestedStepProps {
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  children?: React.ReactNode;
  duration?: string;
}

function NestedStep({ title, icon, isActive, isCompleted, children, duration }: NestedStepProps) {
  return (
    <div className="bg-white/30 backdrop-blur-sm rounded-[10px] p-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4 flex items-center justify-center">
          {isCompleted ? (
            <CircleCheck className="w-4 h-4 text-green-600" />
          ) : (
            icon
          )}
        </div>
        <span className="font-medium text-gray-800 text-sm">{title}</span>
        {isActive && <AnimatedDots color="text-gray-500" />}
        {duration && (
          <span className="text-xs text-gray-500 ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SmartPlanningBubble({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white rounded-[10px] p-2">
      <div className="flex items-center gap-3 mb-3">
            <div className="w-4 h-4 rounded-[10px] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-blue-500" />
        </div>
        <span className="font-medium text-gray-900">Smart planning</span>
      </div>
      
      <p className="text-gray-700 text-sm mb-4">
        Here's a plan I've prepared to create the ad
      </p>
      
      <div className="space-y-2">
        <div className="bg-white/40 backdrop-blur-sm rounded-[10px] p-2">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-800 text-sm">Deep research</span>
          </div>
          <p className="text-xs text-gray-600">
            Dive into the product page, real reviews, and top performing competitor ads
          </p>
        </div>
        
        <div className="bg-white/40 backdrop-blur-sm rounded-[10px] p-2">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-gray-800 text-sm">Shape Ad concepts</span>
          </div>
          <p className="text-xs text-gray-600">
            Blend those insights with your brand voice to sketch 2–3 campaign angles
          </p>
        </div>
        
        <div className="bg-white/40 backdrop-blur-sm rounded-[10px] p-2">
          <div className="flex items-center gap-1 mb-1">
            <ImageIcon className="w-4 h-4 text-green-600" />
            <span className="font-medium text-gray-800 text-sm">Craft the ads</span>
          </div>
          <p className="text-xs text-gray-600">
            Turn the concept you pick into fully finished static visuals + copy
          </p>
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-[10px] max-w-fit">
      <div className="w-4 h-4 flex items-center justify-center">
        <Heart className="w-4 h-4 text-pink-500 animate-pulse" />
      </div>
      <span className="text-gray-700 text-sm">thinking</span>
      <AnimatedDots />
    </div>
  );
}

function DataDisplay({ data, maxLength = 300 }: { data: any; maxLength?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!data) return null;
  
  // Better formatting for different data types
  let content: string;
  let isStructured = false;
  
  if (typeof data === 'string') {
    content = data;
  } else if (typeof data === 'object') {
    isStructured = true;
    // For structured data like scraped content, format it nicely
    if (data.title || data.price || data.description) {
      // Product data formatting
      const parts = [];
      if (data.title) parts.push(`Title: ${data.title}`);
      if (data.price) parts.push(`Price: ${data.price}`);
      if (data.description) parts.push(`Description: ${data.description}`);
      if (data.features && Array.isArray(data.features) && data.features.length > 0) {
        parts.push(`Features: ${data.features.join(', ')}`);
      }
      if (data.rating) parts.push(`Rating: ${data.rating}`);
      if (data.review_count) parts.push(`Reviews: ${data.review_count}`);
      content = parts.join('\n\n');
    } else {
      // Fallback to JSON
      content = JSON.stringify(data, null, 2);
    }
  } else {
    content = String(data);
  }
  
  const isLong = content.length > maxLength;
  const displayContent = isExpanded || !isLong ? content : content.substring(0, maxLength) + '...';
  
  return (
    <div className="bg-white rounded-[10px] p-3 shadow-sm">
      <div className={`text-xs text-gray-600 ${isStructured ? 'whitespace-pre-line' : 'whitespace-pre-wrap'} overflow-hidden ${isStructured ? '' : 'font-mono'}`}>
        {displayContent}
      </div>
      {isLong && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 text-xs mt-2 hover:underline flex items-center gap-1 transition-colors"
        >
          <ChevronDown className={cn(
            "w-3 h-3 transition-transform",
            isExpanded && "rotate-180"
          )} />
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

export function ModernAdGenerationFlow({
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
  stepTimings = []
}: ModernAdGenerationFlowProps) {
  // Start with all sections expanded by default for better UX
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['research', 'creative', 'images'])
  );
  
  const toggleExpanded = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getStepDuration = (stage: string): string | undefined => {
    const timing = stepTimings.find(t => t.stage === stage);
    if (timing?.duration) {
      return `${(timing.duration / 1000).toFixed(1)}s`;
    }
    return undefined;
  };

  // Stage progression tracking
  const stages = [
    'plan', 'page_scrape_started', 'page_scrape_done',
    'research_started', 'research_done', 'concepts_started', 'concepts_done',
    'ideas_started', 'ideas_done', 'images_started', 'image_generation_progress', 'images_done', 'done'
  ];
  
  const currentIndex = stages.indexOf(currentStage);
  const hasReached = (stage: string) => {
    const stageIndex = stages.indexOf(stage);
    return stageIndex !== -1 && stageIndex <= currentIndex;
  };
  const isActive = (stage: string) => stage === currentStage;
  const isCompleted = (stage: string) => {
    const stageIndex = stages.indexOf(stage);
    return stageIndex !== -1 && stageIndex < currentIndex || currentStage === 'done';
  };

  // Map current stage to frontend display stages
  const getFrontendStageFromBackend = (backendStage: Stage): string => {
    switch (backendStage) {
      case 'plan':
        return 'plan';
      case 'page_scrape_started':
        return 'page_scrape_started';
      case 'page_scrape_done':
        return 'page_scrape_done';
      case 'research_started':
        return 'research_started';
      case 'research_done':
        return 'research_done';
      case 'concepts_started':
        return 'concepts_started';
      case 'concepts_done':
        return 'concepts_done';
      case 'ideas_started':
        return 'ideas_started';
      case 'ideas_done':
        return 'ideas_done';
      case 'images_started':
        return 'images_started';
      case 'image_generation_progress':
        return 'image_generation_progress';
      case 'images_done':
        return 'images_done';
      case 'done':
        return 'done';
      default:
        return currentStage;
    }
  };

  const frontendStage = getFrontendStageFromBackend(currentStage);

  // Handle error state
  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-[10px] p-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-sm">!</span>
          </div>
          <span className="font-medium text-red-800">Error occurred</span>
        </div>
        <p className="text-red-700 text-sm mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      {/* Thinking Bubble - only show at the very start */}
      <ThinkingBubble isVisible={!frontendStage || frontendStage === 'plan'} />
      
      {/* Smart Planning - show once we have a plan */}
      <SmartPlanningBubble isVisible={hasReached('plan')} />
      
      {/* Research Agent Bubble */}
      {hasReached('page_scrape_started') && (
        <StepBubble
          title="Research agent"
          icon={<Search className="w-4 h-4 text-purple-600" />}
          gradient="bg-gradient-to-b from-purple-100 to-[#FFFFFF]"
          isActive={frontendStage === 'page_scrape_started' || frontendStage === 'research_started'}
          isCompleted={isCompleted('research_done')}
          isExpanded={expandedSections.has('research')}
          onToggle={() => toggleExpanded('research')}
        >
          {/* Product Details Sub-step */}
          <NestedStep
            title="Product & brand deep dive"
            icon={<Search className="w-4 h-4 text-purple-500" />}
            isActive={frontendStage === 'page_scrape_started'}
            isCompleted={isCompleted('page_scrape_done')}
            duration={getStepDuration('page_scrape_done')}
          >
            {isCompleted('page_scrape_done') && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-2">
                  Reading the product page, reviews, and brand guide to capture voice, visuals, and key benefits
                </p>
                <DataDisplay data={scrapedContent} />
              </div>
            )}
          </NestedStep>

          {/* Market Analysis Sub-step */}
          {hasReached('research_started') && (
            <NestedStep
              title="Market analysis"
              icon={<Brain className="w-4 h-4 text-purple-500" />}
              isActive={frontendStage === 'research_started'}
              isCompleted={isCompleted('research_done')}
              duration={getStepDuration('research_done')}
            >
              {isCompleted('research_done') && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-2">
                    Listening to real customer chatter to surface pain points, desires, and buying triggers
                  </p>
                  <DataDisplay data={researchSummary} />
                </div>
              )}
            </NestedStep>
          )}
          
          {/* Main Research Results - Prominent display when completed */}
          {isCompleted('research_done') && (scrapedContent || researchSummary) && (
            <div className="bg-white/40 backdrop-blur-sm rounded-[10px] p-2 space-y-2">
              <div className="text-xs font-medium text-gray-700 mb-2">Research Summary</div>
              
              {scrapedContent && (
                <div>
                  <div className="text-xs font-medium text-purple-700 mb-1">Product Details</div>
                  <DataDisplay data={scrapedContent} maxLength={300} />
                </div>
              )}
              
              {researchSummary && (
                <div>
                  <div className="text-xs font-medium text-purple-700 mb-1">Market Analysis</div>
                  <DataDisplay data={researchSummary} maxLength={300} />
                </div>
              )}
            </div>
          )}
          
          {/* Competitor Analysis Sub-step */}
          {hasReached('research_done') && (
            <NestedStep
              title="Competitor ad teardown"
              icon={<Search className="w-4 h-4 text-purple-500" />}
              isActive={false}
              isCompleted={isCompleted('research_done')}
            >
              <p className="text-xs text-gray-600">
                Pulling top-performing ads from Meta and beyond to spot proven hooks and angles
              </p>
            </NestedStep>
          )}
        </StepBubble>
      )}

      {/* Creative Strategy Agent Bubble */}
      {hasReached('concepts_started') && (
        <StepBubble
          title="Creative strategy agent"
          icon={<Sparkles className="w-4 h-4 text-amber-600" />}
          gradient="bg-gradient-to-b from-amber-50 to-white"
          isActive={frontendStage === 'concepts_started' || frontendStage === 'ideas_started'}
          isCompleted={isCompleted('ideas_done')}
          isExpanded={expandedSections.has('creative')}
          onToggle={() => toggleExpanded('creative')}
        >
          {/* Ad Concepts Sub-step */}
          <NestedStep
            title="Generating ad concepts"
            icon={<Sparkles className="w-4 h-4 text-amber-500" />}
            isActive={frontendStage === 'concepts_started'}
            isCompleted={isCompleted('concepts_done')}
            duration={getStepDuration('concepts_done')}
          >
            {isCompleted('concepts_done') && (
              <p className="text-xs text-gray-600">
                Boiling research down to must-know takeaways and brand voice cues
              </p>
            )}
          </NestedStep>

          {/* Ad Ideas Sub-step */}
          {hasReached('ideas_started') && (
            <NestedStep
              title="Crafting ad copy ideas"
              icon={<Sparkles className="w-4 h-4 text-amber-500" />}
              isActive={frontendStage === 'ideas_started'}
              isCompleted={isCompleted('ideas_done')}
              duration={getStepDuration('ideas_done')}
            >
              {isCompleted('ideas_done') && adIdeas && (
                <div className="mt-2 space-y-2">
                  {adIdeas.map((idea, index) => (
                    <div key={index} className="bg-white rounded-[10px] p-3 text-xs">
                      <div className="font-medium text-gray-800 mb-1">
                        {idea.title || `Concept ${index + 1}`}
                      </div>
                      {idea.headline && (
                        <div className="text-gray-600 mb-1">{idea.headline}</div>
                      )}
                      {idea.body_text && (
                        <div className="text-gray-500">{idea.body_text}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </NestedStep>
          )}
        </StepBubble>
      )}

      {/* Creating Ads Bubble */}
      {hasReached('images_started') && (
        <StepBubble
          title="Creating ads"
          icon={<ImageIcon className="w-4 h-4 text-green-600" />}
          gradient="bg-gradient-to-b from-green-50 to-white"
          isActive={frontendStage === 'images_started' || frontendStage === 'image_generation_progress'}
          isCompleted={isCompleted('images_done')}
          isExpanded={expandedSections.has('images')}
          onToggle={() => toggleExpanded('images')}
          duration={getStepDuration('images_done')}
        >
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Translating approved concepts into detailed prompts for visuals and copy
            </p>
            
            {(frontendStage === 'images_started' || frontendStage === 'image_generation_progress') && (
              <div className="bg-white/40 backdrop-blur-sm rounded-[10px] p-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-700">
                    {currentImage && totalImages 
                      ? `Generating image ${currentImage} of ${totalImages}`
                      : 'Generating ads'
                    }
                  </span>
                  <AnimatedDots color="text-gray-400" />
                </div>
              </div>
            )}
            
            {generatedImages && generatedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {generatedImages.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Generated ad ${index + 1}`}
                    className="w-full h-auto rounded-[5px]"
                  />
                ))}
              </div>
            )}
          </div>
        </StepBubble>
      )}

      {/* Final Completion */}
      {frontendStage === 'done' && (
            <div className="bg-gradient-to-b from-emerald-50 to-white rounded-[10px] p-2">
          <div className="flex items-center gap-2 mb-2">
            <CircleCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-emerald-800">All ads generated successfully!</span>
          </div>
          {startTime && (
            <div className="flex items-center gap-1 text-sm text-emerald-700">
              <Clock className="w-4 h-4" />
              <span>
                Completed in {Math.round((new Date().getTime() - startTime.getTime()) / 1000)}s
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 