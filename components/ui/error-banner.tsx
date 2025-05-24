"use client";

import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
  showRetry?: boolean;
  showDismiss?: boolean;
  retryText?: string;
  isRetrying?: boolean;
}

/**
 * ErrorBanner component for displaying error messages with retry functionality
 * Used when chat loading or saving fails
 */
export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
  variant = 'error',
  className,
  showRetry = true,
  showDismiss = false,
  retryText = 'Try again',
  isRetrying = false
}: ErrorBannerProps) {
  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-500',
      button: 'text-red-700 hover:text-red-800 bg-red-100 hover:bg-red-200'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-500',
      button: 'text-yellow-700 hover:text-yellow-800 bg-yellow-100 hover:bg-yellow-200'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'text-blue-500',
      button: 'text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200'
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "border rounded-lg p-4 mb-4",
      styles.container,
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Error icon */}
        <AlertTriangle className={cn("w-5 h-5 flex-shrink-0 mt-0.5", styles.icon)} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">
            {variant === 'error' ? 'Failed to load chat' : 'Chat Loading Issue'}
          </p>
          <p className="text-sm opacity-90">{message}</p>
          
          {/* Action buttons */}
          {(showRetry || showDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {showRetry && onRetry && (
                <button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    styles.button,
                    isRetrying && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      {retryText}
                    </>
                  )}
                </button>
              )}
              
              {showDismiss && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Close button */}
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Specialized chat error banner with appropriate messaging
 */
export function ChatErrorBanner({
  error,
  onRetry,
  isRetrying = false,
  className
}: {
  error: string | Error;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return (
    <ErrorBanner
      message={errorMessage}
      onRetry={onRetry}
      isRetrying={isRetrying}
      retryText="Reload chat"
      className={className}
    />
  );
}

/**
 * Inline error message for smaller spaces
 */
export function InlineError({
  message,
  className
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-red-600 text-sm", className)}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
