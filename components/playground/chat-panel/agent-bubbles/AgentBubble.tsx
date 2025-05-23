"use client";

import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, Hourglass, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, AgentBubbleSection, SectionStatus } from '@/store/chatStore';
import { renderLucideIcon } from '@/lib/icon-utils';

interface AgentBubbleProps {
  message: ChatMessage;
}

export function AgentBubble({ message }: AgentBubbleProps) {
  const { agentData } = message;
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (!agentData) return null;
  
  const { type, title, icon, gradient, startTime, endTime, sections, isCompleted } = agentData;
  
  // Calculate duration if completed
  const duration = endTime && startTime 
    ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) 
    : null;
  
  return (
    <div className="flex w-full justify-start overflow-x-visible">
      <div className={cn(
        "max-w-[85%] rounded-[10px] p-3",
        gradient || "bg-gradient-to-b from-blue-50 to-white",
        "border border-slate-200"
      )}>
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            {renderLucideIcon(icon, { className: "w-5 h-5 text-blue-600" })}
            <h3 className="font-medium text-gray-800">{title}</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Timer or completion status */}
            {duration !== null ? (
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                <span>Completed in {duration}s</span>
              </div>
            ) : (
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                <span>00:00</span>
              </div>
            )}
            
            {/* Expand/collapse button */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
        
        {/* Sections */}
        {isExpanded && (
          <div className="space-y-3 mt-2">
            {sections.map(section => (
              <AgentBubbleSectionComponent 
                key={section.id} 
                section={section} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Section component
function AgentBubbleSectionComponent({ section }: { section: AgentBubbleSection }) {
  const { title, description, icon, status, data } = section;
  const [isDataExpanded, setIsDataExpanded] = useState(false);
  
  // Truncate data if it's too long
  const displayData = typeof data === 'string' 
    ? data 
    : JSON.stringify(data, null, 2);
    
  const truncatedData = displayData && displayData.length > 150 
    ? `${displayData.substring(0, 150)}...` 
    : displayData;
  
  return (
    <div className="bg-white/40 backdrop-blur-sm rounded-[10px] p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {renderLucideIcon(icon, { className: "w-4 h-4 text-blue-600" })}
          <span className="font-medium text-gray-800 text-sm">{title}</span>
        </div>
        
        {/* Status indicator */}
        <div className="text-xs">
          {renderStatusIndicator(status)}
        </div>
      </div>
      
      <p className="text-xs text-gray-600">{description}</p>
      
      {/* Data display if available and completed */}
      {status === 'completed' && displayData && (
        <div className="mt-2">
          <div className="text-xs bg-white/60 p-2 rounded-md whitespace-pre-wrap">
            {isDataExpanded ? displayData : truncatedData}
          </div>
          
          {displayData.length > 150 && (
            <button 
              onClick={() => setIsDataExpanded(!isDataExpanded)}
              className="text-xs text-blue-500 mt-1 flex items-center"
            >
              {isDataExpanded ? 'Show less' : 'Show more'}
              {isDataExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to render status indicators
function renderStatusIndicator(status: SectionStatus) {
  switch (status) {
    case 'pending':
      return (
        <div className="flex items-center text-gray-400">
          <Hourglass className="w-3 h-3 mr-1" />
          <span>Pending...</span>
        </div>
      );
    case 'active':
      return (
        <div className="flex items-center text-blue-500">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          <span>In progress...</span>
        </div>
      );
    case 'completed':
      return (
        <div className="flex items-center text-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          <span>Completed</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center text-red-500">
          <AlertTriangle className="w-3 h-3 mr-1" />
          <span>Error</span>
        </div>
      );
  }
}
