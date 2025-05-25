/**
 * Framer Motion animation variants for chat bubbles and UI components
 * Following the specifications from the chat bubble fix documentation
 */

export const fadeSlide = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// AI response bubbles - slide in from left
export const fadeSlideFromLeft = {
  hidden: { opacity: 0, x: -20, y: 8, scale: 0.95 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const scaleFade = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.33, 1, 0.68, 1]
    }
  }
};

// Agent bubbles - slide in from left with scale
export const scaleFadeFromLeft = {
  hidden: { opacity: 0, x: -24, scale: 0.92 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.33, 1, 0.68, 1]
    }
  }
};

export const staggerContainer = {
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  }
};

export const temporaryExit = {
  opacity: 0,
  scale: 0.95,
  filter: 'blur(4px)',
  transition: { duration: 0.25 }
};

export const slideInFromBottom = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const fadeInOut = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// In-progress animation for active agent bubbles
export const inProgressPulse = {
  scale: [1, 1.02, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export const inProgressGlow = {
  boxShadow: [
    "0 0 0 0 rgba(99, 102, 241, 0)",
    "0 0 0 4px rgba(99, 102, 241, 0.1)",
    "0 0 0 0 rgba(99, 102, 241, 0)"
  ],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// Bubble-specific variants
export const bubbleVariants = {
  user: fadeSlide,
  ai: fadeSlideFromLeft,
  agent: scaleFadeFromLeft,
  temporary: {
    ...fadeSlideFromLeft,
    exit: temporaryExit
  }
};
