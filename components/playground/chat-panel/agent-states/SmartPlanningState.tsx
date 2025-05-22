"use client";

import { Brain, Sparkles, Image as ImageIcon } from "lucide-react";
import React from "react";

export interface PlanningStep {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "active" | "completed" | "error";
}

interface SmartPlanningStateProps {
  steps: PlanningStep[];
}

const iconComponentMap: Record<string, React.ReactNode> = {
  "deep research": <Brain className="w-4 h-4" />,
  "shape ad concepts": <Sparkles className="w-4 h-4" />,
  "craft the ads": <ImageIcon className="w-4 h-4" />,
};

export function SmartPlanningState({ steps }: SmartPlanningStateProps) {
  return (
    <div
      className="w-full rounded-[15px] bg-gradient-to-b from-[#DBEAFE] to-white p-5 shadow-sm"
      style={{ minWidth: 320, maxWidth: 400 }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6">
            <img src="/Users/divyanshudv/Desktop/popmint-personal/popmint/public/chat-icons/smart-planning.svg" alt="star" className="w-4 h-4" />
          </span>
          <span className="font-semibold text-[15px] text-black">Smart planning</span>
        </div>
      </div>
      <div className="text-[14px] text-[#181818cc] mb-4 ml-1">Here's a plan I've prepared to create the ad</div>
      <div className="flex flex-col gap-3">
        {steps.map((step) => {
          const iconKey = Object.keys(iconComponentMap).find((k) => step.title.toLowerCase().includes(k)) || "deep research";
          const IconComponent = iconComponentMap[iconKey];
          return (
            <div
              key={step.id}
              className="rounded-[10px] bg-[rgba(0,0,0,0.03)] px-3 py-2 flex flex-col gap-1"
            >
              <div className="flex items-center gap-2 mb-0.5">
                {IconComponent}
                <span className="font-medium text-[14px] text-[#181818cc]">{step.title}</span>
              </div>
              {step.description && (
                <div className="text-[14px] text-[#181818cc] leading-snug">
                  {step.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
