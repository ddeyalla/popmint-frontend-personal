"use client";

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { renderLucideIcon } from '@/lib/icon-utils';

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
    <div className="flex w-full justify-start overflow-x-visible animate-fadeIn">
      <div className="flex items-center gap-2 p-2.5 max-w-[85%] break-words bg-white/80 rounded-[10px] shadow-sm">
        {icon === 'Loader2' ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : (
          renderLucideIcon(icon || 'MessageCircle', { className: "w-4 h-4 text-blue-500" })
        )}
        <span className="text-gray-700">{content}</span>
      </div>
    </div>
  );
}
