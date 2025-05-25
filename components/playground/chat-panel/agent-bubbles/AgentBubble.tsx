"use client";

import React, { useState, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, AgentBubbleSection, SectionStatus } from '@/store/chatStore';
import { renderLucideIcon } from '@/lib/icon-utils';
import { formatJsonData, cleanString, truncateText, extractConcepts } from '@/lib/format-utils';
import { motion } from 'framer-motion';
import { bubbleVariants, staggerContainer } from '@/lib/motion-variants';
import { useLiveTimer, useCompletionTimer } from '@/hooks/useLiveTimer';
import { StatusPill, StatusType } from '@/components/ui/status-pill';

interface AgentBubbleProps {
  message: ChatMessage;
}

export function AgentBubble({ message }: AgentBubbleProps) {
  const { agentData } = message;
  const [isExpanded, setIsExpanded] = useState(true);

  if (!agentData) return null;

  const { title, icon, startTime, endTime, sections, isCompleted } = agentData;

  // Use live timer hooks
  const liveTimer = useLiveTimer(isCompleted ? null : startTime);
  const completionTimer = useCompletionTimer(startTime, endTime);

  // Removed audio effects for better UX



  return (
    <motion.div
      variants={bubbleVariants.agent}
      initial="hidden"
      animate="show"
      className="flex w-full justify-start overflow-x-visible mb-6"
    >
      <motion.div
        className={cn(
          "max-w-3xl rounded-[15px] px-5 py-4 shadow-sm border border-[#EFEFEF] border-l-4 border-l-pm-indigo", // max-w-3xl, px-5 py-4, border-l-4 as specified
          "bg-pm-bubble-agent" // Use new design token
        )}

      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            {renderLucideIcon(icon, { className: "w-5 h-5 text-pm-indigo" })} {/* 20px icon as specified */}
            <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer display - removed colors, added spacing */}
            {completionTimer ? (
              <div className="flex items-center text-xs text-gray-500 font-medium">
                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                <span>{completionTimer}</span>
              </div>
            ) : liveTimer ? (
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1.5" />
                <span>{liveTimer}</span>
              </div>
            ) : null}

            {/* Expand/collapse button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Sections */}
        {isExpanded && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-2 mt-3"
          >
            {sections.map(section => (
              <AgentBubbleSectionComponent
                key={section.id}
                section={section}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
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

  // Map section status to StatusPill status
  const getStatusType = (status: SectionStatus): StatusType => {
    switch (status) {
      case 'pending': return 'pending';
      case 'active': return 'active';
      case 'completed': return 'completed';
      case 'error': return 'error';
      default: return 'pending';
    }
  };

  return (
    <motion.div
      variants={bubbleVariants.ai}
      className="bg-white shadow-xs rounded-[15px] px-3 py-2 border border-[#EFEFEF]" // bg-white + shadow-xs as specified
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {renderLucideIcon(icon, { className: "w-4 h-4 text-pm-indigo" })} {/* 16px icon as specified */}
          <span className="font-medium text-gray-800 text-sm">{title}</span>
        </div>

        {/* Status pill */}
        <StatusPill status={getStatusType(status)} />
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{description}</p>

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
    </motion.div>
  );
}


