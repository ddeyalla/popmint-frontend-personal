"use client";

import React, { useEffect } from 'react';
import { Loader2, Brain, Search, Lightbulb, Image } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { renderLucideIcon } from '@/lib/icon-utils';
import { motion } from 'framer-motion';
import { bubbleVariants } from '@/lib/motion-variants';

interface TemporaryStatusBubbleProps {
  message: any; // ChatMessage type
}

// Helper function to get contextual status message and icon
const getContextualStatus = (content: string, originalIcon?: string) => {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('thinking') || lowerContent.includes('planning') || lowerContent.includes('analyzing')) {
    return {
      message: 'Thinking...',
      icon: Brain,
      iconClass: 'text-purple-600'
    };
  } else if (lowerContent.includes('research') || lowerContent.includes('searching') || lowerContent.includes('finding')) {
    return {
      message: 'Researching...',
      icon: Search,
      iconClass: 'text-blue-600'
    };
  } else if (lowerContent.includes('generat') || lowerContent.includes('creat') || lowerContent.includes('concept') || lowerContent.includes('ad')) {
    return {
      message: 'Generating ads...',
      icon: Lightbulb,
      iconClass: 'text-yellow-600'
    };
  } else if (lowerContent.includes('image') || lowerContent.includes('visual') || lowerContent.includes('picture')) {
    return {
      message: 'Creating visuals...',
      icon: Image,
      iconClass: 'text-green-600'
    };
  } else {
    // Fallback to original content and icon
    return {
      message: content,
      icon: originalIcon === 'Loader2' ? Loader2 : null,
      iconClass: 'text-pm-indigo'
    };
  }
};

export function TemporaryStatusBubble({ message }: TemporaryStatusBubbleProps) {
  const { id, content, icon } = message;
  const removeMessage = useChatStore(state => state.removeMessage);

  // Get contextual status
  const contextualStatus = getContextualStatus(content, icon);

  // Auto-remove after a shorter delay for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      removeMessage(id);
    }, 3000); // 3 seconds for faster transitions

    return () => clearTimeout(timer);
  }, [id, removeMessage]);

  return (
    <motion.div
      variants={bubbleVariants.temporary}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex w-full justify-start overflow-x-visible mb-6"
    >
      <div className="flex items-center gap-3 p-3 break-words bg-white/95 backdrop-blur-sm rounded-[15px] shadow-sm border border-[#EFEFEF]">
        {contextualStatus.icon ? (
          React.createElement(contextualStatus.icon, {
            className: `w-4 h-4 ${contextualStatus.icon === Loader2 ? 'animate-spin' : ''} ${contextualStatus.iconClass}`
          })
        ) : (
          renderLucideIcon(icon || 'MessageCircle', { className: "w-4 h-4 text-pm-indigo" })
        )}
        <span className="text-gray-700 text-sm font-medium">{contextualStatus.message}</span>
      </div>
    </motion.div>
  );
}
