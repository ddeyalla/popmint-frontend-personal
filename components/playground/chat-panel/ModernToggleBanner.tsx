"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ModernToggleBannerProps {
  isVisible?: boolean;
  onToggle?: (isExpanded: boolean) => void;
}

export function ModernToggleBanner({ 
  isVisible = true, 
  onToggle 
}: ModernToggleBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onToggle?.(newState);
  };

  if (!isVisible) return null;

  return (
    <div className="w-full mb-4">
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
          "bg-gradient-to-r from-chat-bg-agent to-chat-bg-research",
          "border border-chat-border-light hover:border-chat-border-accent",
          "shadow-sm hover:shadow-md",
          "group"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-chat-text-accent/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-chat-text-accent" />
          </div>
          <div className="text-left">
            <div className="font-medium text-chat-text-primary text-sm">
              Modern Chat Experience
            </div>
            <div className="text-xs text-chat-text-muted">
              {isExpanded ? 'Hide settings' : 'View advanced options'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-chat-text-muted">
            {isExpanded ? 'Collapse' : 'Expand'}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-chat-text-muted group-hover:text-chat-text-accent transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-chat-text-muted group-hover:text-chat-text-accent transition-colors" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 rounded-xl bg-chat-bg-secondary border border-chat-border-light">
              <div className="space-y-4">
                {/* Settings Header */}
                <div className="flex items-center gap-2 pb-2 border-b border-chat-border-light">
                  <Settings className="w-4 h-4 text-chat-text-accent" />
                  <span className="font-medium text-chat-text-primary text-sm">
                    Chat Settings
                  </span>
                </div>

                {/* Settings Options */}
                <div className="space-y-3">
                  {/* Message Queue Settings */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-chat-text-primary">
                        Sequential Messages
                      </div>
                      <div className="text-xs text-chat-text-muted">
                        Display messages one at a time for better flow
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="sr-only peer"
                        onChange={(e) => {
                          // Update message queue config
                          import('@/lib/message-queue').then(({ updateMessageQueueConfig }) => {
                            updateMessageQueueConfig({ enableSequencing: e.target.checked });
                          });
                        }}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-chat-text-accent"></div>
                    </label>
                  </div>

                  {/* Sound Effects */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-chat-text-primary">
                        Sound Effects
                      </div>
                      <div className="text-xs text-chat-text-muted">
                        Play sounds for message events
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="sr-only peer"
                        onChange={(e) => {
                          // Update sound settings
                          import('@/lib/playSFX').then(({ playSFX }) => {
                            playSFX.setEnabled(e.target.checked);
                          });
                        }}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-chat-text-accent"></div>
                    </label>
                  </div>

                  {/* Auto-scroll */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-chat-text-primary">
                        Auto-scroll
                      </div>
                      <div className="text-xs text-chat-text-muted">
                        Automatically scroll to new messages
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-chat-text-accent"></div>
                    </label>
                  </div>
                </div>

                {/* Status Info */}
                <div className="pt-3 border-t border-chat-border-light">
                  <div className="text-xs text-chat-text-muted">
                    <div className="flex items-center justify-between">
                      <span>Chat System:</span>
                      <span className="text-chat-text-success font-medium">Modern v2.0</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span>Message Queue:</span>
                      <span className="text-chat-text-success font-medium">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
