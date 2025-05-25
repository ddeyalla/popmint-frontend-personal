"use client";

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/store/chatStore';
import { renderLucideIcon } from '@/lib/icon-utils';
import { motion } from 'framer-motion';
import { bubbleVariants } from '@/lib/motion-variants';
import { useLiveTimer, useCompletionTimer } from '@/hooks/useLiveTimer';

interface ModernAgentBubbleProps {
  message: ChatMessage;
}

export function ModernAgentBubble({ message }: ModernAgentBubbleProps) {
  const { agentData } = message;

  if (!agentData) return null;

  const { type, title, icon, startTime, endTime, isCompleted } = agentData;

  // Use timer hooks
  const liveTimer = useLiveTimer(isCompleted ? null : startTime);
  const completionTimer = useCompletionTimer(startTime, endTime);

  // Removed audio effects for better UX

  // Get bubble styling based on type
  const getBubbleStyle = (bubbleType: string) => {
    switch (bubbleType) {
      case 'plan':
        return {
          bg: 'bg-chat-bg-agent',
          border: 'border-chat-border-light',
          iconColor: 'text-chat-text-accent',
          titleColor: 'text-chat-text-primary'
        };
      case 'product_analysis':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900'
        };
      case 'research':
        return {
          bg: 'bg-chat-bg-research',
          border: 'border-sky-200',
          iconColor: 'text-sky-600',
          titleColor: 'text-sky-900'
        };
      case 'creative_strategy':
        return {
          bg: 'bg-chat-bg-concept',
          border: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900'
        };
      case 'ad_creation':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900'
        };
      default:
        return {
          bg: 'bg-chat-bg-ai',
          border: 'border-chat-border-light',
          iconColor: 'text-chat-text-accent',
          titleColor: 'text-chat-text-primary'
        };
    }
  };

  const style = getBubbleStyle(type);

  // Get contextual status message based on agent type
  const getContextualStatusMessage = (agentType: string): string => {
    switch (agentType) {
      case 'plan':
        return 'Thinking...';
      case 'product_analysis':
        return 'Analyzing product...';
      case 'research':
        return 'Researching...';
      case 'creative_strategy':
        return 'Generating ads...';
      case 'ad_creation':
        return 'Creating visuals...';
      default:
        return 'Processing...';
    }
  };

  // Get timer display - exclude timer for smart planning bubble
  const getTimerDisplay = () => {
    // Don't show timer for smart planning bubble
    if (type === 'plan') {
      return null;
    }

    if (isCompleted && completionTimer) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <CheckCircle2 className="w-3 h-3" />
          <span>{completionTimer}</span>
        </div>
      );
    } else if (liveTimer) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{liveTimer}</span>
        </div>
      );
    }
    return null;
  };

  // Get plan content for display
  const getPlanContent = () => {
    if (type === 'plan') {
      return (
        <div className="mt-3 text-xs text-gray-600 leading-relaxed">
          <div className="text-xs text-gray-500 mb-2 font-medium">Here's my plan to create your ads:</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Analyze product page</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Research market & audience</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Generate ad concepts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span>Create visual assets</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      variants={bubbleVariants.agent}
      initial="hidden"
      animate="show"
      className="flex w-full justify-start overflow-x-visible mb-4"
    >
      <div className="max-w-lg">
        <div
          className={cn(
            "rounded-[15px] px-4 py-3 shadow-sm border border-[#EFEFEF]",
            style.bg
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              {renderLucideIcon(icon, {
                className: cn("w-4 h-4", style.iconColor)
              })}
              <span className={cn("font-semibold text-sm", style.titleColor)}>
                {title}
              </span>
            </div>

            {/* Timer in top-right corner */}
            {getTimerDisplay()}
          </div>

          {/* Plan content for smart planning bubble */}
          {getPlanContent()}

          {/* Status indicator for active bubbles */}
          {!isCompleted && (
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span className="font-medium">{getContextualStatusMessage(type)}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Research Output Bubble Component
interface ResearchOutputBubbleProps {
  content: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function ResearchOutputBubble({
  content,
  isExpanded = false,
  onToggleExpand
}: ResearchOutputBubbleProps) {
  const [showExpanded, setShowExpanded] = useState(isExpanded);

  // Clean and format the content
  const cleanContent = content
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/^\s*[\{\[]/, '')
    .replace(/[\}\]]\s*$/, '');

  // Truncate to 300 words if not expanded
  const words = cleanContent.split(' ');
  const truncatedContent = words.slice(0, 300).join(' ');
  const needsTruncation = words.length > 300;

  const displayContent = showExpanded ? cleanContent : truncatedContent;

  const handleToggle = () => {
    setShowExpanded(!showExpanded);
    onToggleExpand?.();
  };

  return (
    <motion.div
      variants={bubbleVariants.ai}
      initial="hidden"
      animate="show"
      className="flex w-full justify-start overflow-x-visible mb-4"
    >
      <div className="max-w-lg">
        <div className="rounded-[15px] px-4 py-3 bg-chat-bg-research border border-[#EFEFEF] shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <span className="font-medium text-sm text-sky-900">Research Insights</span>
          </div>

          {/* Content */}
          <div className="text-sm text-chat-text-secondary leading-relaxed whitespace-pre-wrap">
            {displayContent}
          </div>

          {/* View More/Less Button */}
          {needsTruncation && (
            <button
              onClick={handleToggle}
              className="mt-3 text-xs text-chat-text-accent hover:text-chat-text-primary transition-colors font-medium"
            >
              {showExpanded ? 'View Less' : 'View More'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Individual Ad Concept Bubble Component
interface AdConceptBubbleProps {
  concept: any;
  index: number;
}

export function AdConceptBubble({ concept, index }: AdConceptBubbleProps) {
  return (
    <motion.div
      variants={bubbleVariants.ai}
      initial="hidden"
      animate="show"
      className="flex w-full justify-start overflow-x-visible mb-4"
    >
      <div className="max-w-lg">
        <div className="rounded-[15px] px-4 py-3 bg-chat-bg-concept border border-[#EFEFEF] shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold">
              {index + 1}
            </div>
            <span className="font-medium text-sm text-yellow-900">
              {concept.concept_name || `Ad Concept ${index + 1}`}
            </span>
          </div>

          {/* Content */}
          <div className="space-y-2 text-sm">
            {concept.title && (
              <div>
                <span className="font-medium text-chat-text-primary">Title: </span>
                <span className="text-chat-text-secondary">{concept.title}</span>
              </div>
            )}

            {concept.headline && (
              <div>
                <span className="font-medium text-chat-text-primary">Headline: </span>
                <span className="text-chat-text-secondary italic">{concept.headline}</span>
              </div>
            )}

            {concept.description && (
              <div>
                <span className="font-medium text-chat-text-primary">Description: </span>
                <span className="text-chat-text-secondary">{concept.description}</span>
              </div>
            )}

            {concept.cta && (
              <div>
                <span className="font-medium text-chat-text-primary">CTA: </span>
                <span className="text-chat-text-secondary font-medium">{concept.cta}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
