"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { scaleFade } from '@/lib/motion-variants';
import { useLiveTimer } from '@/hooks/useLiveTimer';
import { cn } from '@/lib/utils';

interface ActiveTaskBannerProps {
  isVisible: boolean;
  currentStage: string;
  startTime: Date | null;
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function ActiveTaskBanner({ 
  isVisible, 
  currentStage, 
  startTime, 
  currentStep, 
  totalSteps,
  className 
}: ActiveTaskBannerProps) {
  const liveTimer = useLiveTimer(startTime);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={scaleFade}
          initial="hidden"
          animate="show"
          exit="hidden"
          className={cn(
            "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
            "bg-white/90 backdrop-blur-sm shadow-lg border border-white/20",
            "rounded-full px-4 py-2",
            "flex items-center gap-3",
            className
          )}
        >
          {/* Current stage */}
          <span className="text-sm font-medium text-gray-800">
            {currentStage}
          </span>

          {/* Step counter */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span>{currentStep}</span>
            <span>/</span>
            <span>{totalSteps}</span>
          </div>

          {/* Live timer */}
          {liveTimer && (
            <div className="flex items-center gap-1 text-xs text-pm-indigo">
              <Clock className="w-3 h-3" />
              <span>{liveTimer}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
