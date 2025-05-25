"use client";

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { renderLucideIcon } from '@/lib/icon-utils';
import { motion } from 'framer-motion';
import { bubbleVariants } from '@/lib/motion-variants';

interface TemporaryStatusBubbleProps {
  message: any; // ChatMessage type
}

export function TemporaryStatusBubble({ message }: TemporaryStatusBubbleProps) {
  const { id, content, icon } = message;
  const removeMessage = useChatStore(state => state.removeMessage);

  // Auto-remove after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      removeMessage(id);
    }, 5000); // 5 seconds

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
      <div className="flex items-center gap-2 p-3 break-words bg-white/90 backdrop-blur-sm rounded-[15px] shadow-sm border border-[#EFEFEF]">
        {icon === 'Loader2' ? (
          <Loader2 className="w-4 h-4 animate-spin text-pm-indigo" />
        ) : (
          renderLucideIcon(icon || 'MessageCircle', { className: "w-4 h-4 text-pm-indigo" })
        )}
        <span className="text-gray-700 text-sm">{content}</span>
      </div>
    </motion.div>
  );
}
