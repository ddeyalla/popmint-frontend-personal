"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'chat' | 'message' | 'default';
  count?: number;
}

/**
 * LoadingSkeleton component for displaying loading states
 * Used while chat messages are being fetched from the server
 */
export function LoadingSkeleton({ 
  className, 
  variant = 'default',
  count = 3 
}: LoadingSkeletonProps) {
  if (variant === 'chat') {
    return (
      <div className={cn("space-y-4 p-4", className)}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex gap-3">
            {/* Avatar skeleton */}
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse flex-shrink-0 mt-1" />
            
            {/* Message content skeleton */}
            <div className="flex-1 space-y-2">
              <div className="bg-gray-200 rounded-[10px] p-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4" />
                  <div className="h-4 bg-gray-300 rounded w-1/2" />
                  <div className="h-3 bg-gray-300 rounded w-1/4 mt-2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'message') {
    return (
      <div className={cn("flex gap-3", className)}>
        {/* Avatar skeleton */}
        <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse flex-shrink-0 mt-1" />
        
        {/* Single message skeleton */}
        <div className="flex-1">
          <div className="bg-gray-200 rounded-[10px] p-3 animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-2/3" />
              <div className="h-4 bg-gray-300 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

/**
 * Specialized chat loading skeleton with proper styling
 */
export function ChatLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {/* Loading indicator */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Loading chat history...</span>
        </div>
      </div>
      
      {/* Skeleton messages */}
      <LoadingSkeleton variant="chat" count={2} />
    </div>
  );
}

/**
 * Minimal loading spinner for inline use
 */
export function LoadingSpinner({ 
  size = 16, 
  className 
}: { 
  size?: number; 
  className?: string; 
}) {
  return (
    <div 
      className={cn("border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin", className)}
      style={{ width: size, height: size }}
    />
  );
}
