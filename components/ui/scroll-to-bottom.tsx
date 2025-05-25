"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeSlide } from '@/lib/motion-variants';

interface ScrollToBottomProps {
  isVisible: boolean;
  onClick: () => void;
  className?: string;
}

export function ScrollToBottom({ isVisible, onClick, className }: ScrollToBottomProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          variants={fadeSlide}
          initial="hidden"
          animate="show"
          exit="hidden"
          onClick={onClick}
          className={cn(
            "fixed bottom-20 right-6 z-50",
            "w-10 h-10 rounded-full",
            "bg-white/90 backdrop-blur-sm shadow-lg border border-white/20",
            "flex items-center justify-center",
            "hover:bg-white hover:shadow-xl",
            "transition-all duration-200",
            "text-gray-600 hover:text-gray-800",
            className
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
