import { PlanningStep } from "@/components/playground/chat-panel/agent-states/SmartPlanningState";
import { Code, Wand2, Sparkles, Brain } from "lucide-react";

// Define the types for SSE events - updated to match backend exactly
export type Stage =
  | "plan" 
  | "page_scrape_started" 
  | "page_scrape_done" 
  | "image_extraction_started" 
  | "image_extraction_done" 
  | "research_started" 
  | "research_done" 
  | "concepts_started" 
  | "concepts_done" 
  | "ideas_started" 
  | "ideas_done" 
  | "images_started" 
  | "image_generation_progress" 
  | "images_done" 
  | "done" 
  | "error";

export interface SseEvent {
  jobId: string;
  stage: Stage;
  pct?: number;
  message?: string;
  data?: any;
  errorCode?: string;
}

// Define the UI component states based on Frontend-flow.md
export type AgentComponentState = 
  | "thinking" 
  | "smart_planning" 
  | "checking_product_details"
  | "researching" 
  | "generating_concepts"
  | "generating_ideas"
  | "generating_ads" 
  | "task_complete" 
  | "error";

// Map SSE events to UI component states following Frontend-flow.md exactly
export function mapStageToComponentState(stage: Stage): AgentComponentState {
  switch (stage) {
    case "plan":
      return "smart_planning";
    case "page_scrape_started":
      return "checking_product_details";
    case "page_scrape_done":
      return "checking_product_details"; // Stay in same state, just show results
    case "image_extraction_started":
    case "image_extraction_done":
      return "checking_product_details"; // No UI updates for image extraction per Frontend-flow.md
    case "research_started":
      return "researching";
    case "research_done":
      return "researching"; // Stay in same state, show results
    case "concepts_started":
      return "generating_concepts";
    case "concepts_done":
      return "generating_concepts"; // Stay in same state, move to next step
    case "ideas_started":
      return "generating_ideas";
    case "ideas_done":
      return "generating_ideas"; // Stay in same state, show results
    case "images_started":
    case "image_generation_progress":
    case "images_done":
      return "generating_ads";
    case "done":
      return "task_complete";
    case "error":
      return "error";
    default:
      return "thinking";
  }
}

// Get the smart planning steps with their status based on the current stage
export function getSmartPlanningSteps(currentStage: Stage): PlanningStep[] {
  const steps: PlanningStep[] = [
    {
      id: "research",
      title: "Deep research",
      description: "Dive into the product page, real reviews, and top performing competitor ads",
      status: "pending"
    },
    {
      id: "concepts", 
      title: "Shape Ad concepts",
      description: "Blend those insights with your brand voice to sketch 2–3 campaign angles each with a clear promise, vibe, and CTA",
      status: "pending"
    },
    {
      id: "generation",
      title: "Craft the ads",
      description: "Turn the concept you pick into fully finished static visuals + copy",
      status: "pending"
    }
  ];

  // Update the status of each step based on the current stage
  switch (currentStage) {
    case "plan":
    case "page_scrape_started":
    case "page_scrape_done":
    case "image_extraction_started":
    case "image_extraction_done":
      // All steps are pending during initial phases
      break;
    case "research_started":
      steps[0].status = "active";
      break;
    case "research_done":
      steps[0].status = "completed";
      break;
    case "concepts_started":
      steps[0].status = "completed";
      steps[1].status = "active";
      break;
    case "concepts_done":
    case "ideas_started":
      steps[0].status = "completed";
      steps[1].status = "completed";
      break;
    case "ideas_done":
    case "images_started":
    case "image_generation_progress":
      steps[0].status = "completed";
      steps[1].status = "completed";
      steps[2].status = "active";
      break;
    case "images_done":
    case "done":
      steps[0].status = "completed";
      steps[1].status = "completed";
      steps[2].status = "completed";
      break;
    default:
      // Keep default status
      break;
  }

  return steps;
}

// Get messages for different stages following Frontend-flow.md
export function getStageMessage(stage: Stage): string {
  switch (stage) {
    case "page_scrape_started":
      return "Checking product details...";
    case "page_scrape_done":
      return "Product details checked";
    case "image_extraction_started":
      return "Extracting product images...";
    case "image_extraction_done":
      return "Product images extracted";
    case "research_started":
      return "Researching...";
    case "research_done":
      return "Research completed";
    case "concepts_started":
      return "Generating ad concepts...";
    case "concepts_done":
      return "Ad concepts generated";
    case "ideas_started":
      return "Generating ad copy ideas...";
    case "ideas_done":
      return "Ad copy ideas generated";
    case "images_started":
      return "Generating ads...";
    case "image_generation_progress":
      return "Generating ads...";
    case "images_done":
      return "Ads generated";
    case "done":
      return "All ads generated successfully!";
    default:
      return "Thinking...";
  }
}

// Calculate the duration of the task
export function calculateDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return `${diffSecs} seconds`;
  }
  
  const minutes = Math.floor(diffSecs / 60);
  const seconds = diffSecs % 60;
  
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
}

// Utility function to get the display name for a stage
export function getStageDisplayName(stage: Stage): string {
  switch (stage) {
    case "plan":
      return "Smart Planning";
    case "page_scrape_started":
      return "Checking Product Details";
    case "page_scrape_done":
      return "Product Details Complete";
    case "image_extraction_started":
      return "Extracting Product Images";
    case "image_extraction_done":
      return "Product Images Extracted";
    case "research_started":
      return "Researching";
    case "research_done":
      return "Research Complete";
    case "concepts_started":
      return "Generating Ad Concepts";
    case "concepts_done":
      return "Ad Concepts Ready";
    case "ideas_started":
      return "Creating Ad Ideas";
    case "ideas_done":
      return "Ad Ideas Ready";
    case "images_started":
      return "Starting Image Generation";
    case "image_generation_progress":
      return "Generating Images";
    case "images_done":
      return "Images Generated";
    case "done":
      return "Task Complete";
    case "error":
      return "Error";
    default:
      return (stage as string).replace(/_/g, ' ');
  }
}

// Get the appropriate icon name for a stage
export function getStageIcon(stage: Stage): string {
  const componentState = mapStageToComponentState(stage);
  
  switch (componentState) {
    case "thinking":
      return "heart";
    case "smart_planning":
      return "clipboard-list";
    case "researching":
      return "search-code";
    case "generating_concepts":
      return "lollipop";
    case "generating_ideas":
      return "sparkles";
    case "generating_ads":
      return "sparkles";
    case "task_complete":
      return "check-circle";
    case "error":
      return "alert-circle";
    default:
      return "circle";
  }
}

// Get stage progress information
export function getStageProgress(stage: Stage): { 
  isComplete: boolean;
  isActive: boolean; 
  isError: boolean;
  pct: number;
} {
  return {
    isComplete: stage.endsWith('_done') || stage === 'done',
    isActive: !stage.endsWith('_done') && stage !== 'done' && stage !== 'error',
    isError: stage === 'error',
    pct: stage === 'done' ? 100 : stage.endsWith('_done') ? 100 : 0
  };
}

// Determine if a stage should show data results
export function shouldShowStageData(stage: Stage): boolean {
  return [
    'page_scrape_done',
    'research_done', 
    'ideas_done',
    'images_done',
    'done'
  ].includes(stage);
}

// Check if we should show progress/loading animation
export function shouldShowProgress(stage: Stage): boolean {
  return [
    'page_scrape_started',
    'research_started',
    'concepts_started',
    'ideas_started',
    'images_started',
    'image_generation_progress'
  ].includes(stage);
}
