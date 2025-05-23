"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp, Hourglass, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, AgentBubbleSection, SectionStatus } from '@/store/chatStore';
import { renderLucideIcon } from '@/lib/icon-utils';
import { formatJsonData, cleanString, truncateText, isConceptData, extractConcepts } from '@/lib/format-utils';

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
        "max-w-[85%] rounded-[10px] p-3 shadow-sm",
        gradient || "bg-gradient-to-b from-blue-50 to-white"
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
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle expanding content with smooth scroll
  const handleExpandToggle = () => {
    const newExpandedState = !isDataExpanded;
    setIsDataExpanded(newExpandedState);

    // If expanding, scroll to show the newly revealed content after a short delay
    if (newExpandedState && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
    }
  };

  // Check if this is concept data
  const concepts = extractConcepts(data);
  const hasConcepts = concepts.length > 0;

  // Format string data
  let formattedStringData = '';
  if (!hasConcepts && data) {
    formattedStringData = typeof data === 'string'
      ? cleanString(data)
      : formatJsonData(data);
  }

  // Truncate text for display
  const truncatedData = formattedStringData.length > 300
    ? truncateText(formattedStringData, 300)
    : formattedStringData;

  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-[10px] p-3 shadow-sm">
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
      {status === 'completed' && (
        <div className="mt-2">
          {hasConcepts ? (
            // Display concepts in separate bubbles
            <div className="space-y-4">
              {concepts.map((concept, index) => (
                <div key={index} className="bg-white/90 rounded-[10px] p-3 shadow-sm">
                  {/* Concept name/title */}
                  {concept.concept_name && (
                    <h3 className="font-medium text-sm mb-2 text-blue-600">{concept.concept_name}</h3>
                  )}

                  {/* Title */}
                  {concept.title && (
                    <h4 className="text-sm mb-2 font-semibold">{concept.title}</h4>
                  )}

                  {/* Headline */}
                  {concept.headline && (
                    <div className="text-sm mb-2 italic font-medium">{concept.headline}</div>
                  )}

                  {/* Body text with truncation */}
                  {concept.body_text && (
                    <div className="text-sm mb-2">
                      <p className="font-medium text-xs text-gray-700 mb-1">Body Text:</p>
                      <p>{concept.body_text.length > 300 && !isDataExpanded
                        ? truncateText(concept.body_text, 300)
                        : concept.body_text}
                      </p>

                      {concept.body_text.length > 300 && (
                        <button
                          onClick={handleExpandToggle}
                          className="text-xs text-blue-500 mt-1 flex items-center"
                        >
                          {isDataExpanded ? 'Show less' : 'Show more'}
                          {isDataExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Ad description with truncation */}
                  {concept.ad_description && (
                    <div className="text-sm mb-2 text-gray-600">
                      <p className="font-medium text-xs text-gray-700 mb-1">Description:</p>
                      <p>{concept.ad_description.length > 300 && !isDataExpanded
                        ? truncateText(concept.ad_description, 300)
                        : concept.ad_description}
                      </p>

                      {concept.ad_description.length > 300 && (
                        <button
                          onClick={handleExpandToggle}
                          className="text-xs text-blue-500 mt-1 flex items-center"
                        >
                          {isDataExpanded ? 'Show less' : 'Show more'}
                          {isDataExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  {concept.cta && (
                    <div className="text-sm text-blue-600 font-medium mt-2 p-1 bg-blue-50 rounded-md text-center">
                      {concept.cta}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Display regular text/JSON data
            formattedStringData && (
              <>
                <div
                  ref={contentRef}
                  className="text-xs bg-white/60 p-3 rounded-md whitespace-pre-wrap"
                >
                  {isDataExpanded ? formattedStringData : truncatedData}
                </div>

                {formattedStringData.length > 300 && (
                  <button
                    onClick={handleExpandToggle}
                    className="text-xs text-blue-500 mt-2 flex items-center"
                  >
                    {isDataExpanded ? 'Show less' : 'Show more'}
                    {isDataExpanded ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
                  </button>
                )}
              </>
            )
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
