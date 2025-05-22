"use client";

import React from "react";
import { Wand2, Brain, FileText, Code, Sparkles } from "lucide-react"; 

export interface PlanningStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "active" | "completed" | "error";
  icon: React.ElementType;
  agent?: "research" | "creative" | "generation";
  data?: any;
}

interface SmartPlanningStateProps {
  steps: PlanningStep[];
}

const getIconForStep = (title: string): React.ElementType => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("deep research")) return Code; 
  if (lowerTitle.includes("shape ad concepts")) return Wand2;
  if (lowerTitle.includes("craft the ads")) return Sparkles;
  return Brain; // Default icon
};

export function SmartPlanningState({ steps }: SmartPlanningStateProps) {
  return (
    <div className="flex flex-col gap-3 w-full p-4 rounded-lg bg-[#E9EAF4] shadow-sm text-[#333]">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-purple-600" /> 
        <span className="text-md font-semibold text-gray-800">Smart planning</span>
      </div>
      
      <p className="text-sm text-gray-600 ml-1">Here's a plan I've prepared to create the ad</p>
      
      <div className="flex flex-col gap-3 mt-2">
        {steps.map((step) => {
          const StepSpecificIcon = step.icon || getIconForStep(step.title);

          return (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 rounded-md bg-[#F5F6FA] hover:shadow-sm transition-shadow"
            >
              {StepSpecificIcon && (
                <div className="flex-shrink-0 mt-1">
                  <StepSpecificIcon className="h-5 w-5 text-gray-700" />
                </div>
              )}
              <div className="flex-grow">
                <span className="block text-sm font-medium text-gray-800">
                  {step.title}
                </span>
                {step.description && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
