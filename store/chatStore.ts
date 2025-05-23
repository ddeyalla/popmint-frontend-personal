import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Simplified stage system - one source of truth
export type AdGenerationStage =
  | 'thinking'
  | 'planning'
  | 'scraping'
  | 'researching'
  | 'concepting'
  | 'ideating'
  | 'imaging'
  | 'completed'
  | 'error';

// Simplified message types
export type MessageType =
  | 'text'
  | 'ad_generation'
  | 'ad_step_complete'
  | 'agent_progress'
  | 'agent_output'
  | 'agent_bubble'
  | 'temporary_status'
  | 'error';

// Step timing information
export interface StepTiming {
  stage: AdGenerationStage;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  message?: string;
  data?: any;
}

// Agent bubble types
export type AgentBubbleType =
  | 'plan'
  | 'product_analysis'
  | 'research'
  | 'creative_strategy'
  | 'ad_creation';

// Section status types
export type SectionStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'error';

// Agent bubble section
export interface AgentBubbleSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: SectionStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  data?: any;
}

// Agent bubble data
export interface AgentBubbleData {
  type: AgentBubbleType;
  title: string;
  icon: string;
  gradient?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  sections: AgentBubbleSection[];
  isCompleted: boolean;
  error?: string;
  jobId: string;
}

// Simplified ad generation data
export interface AdGenerationData {
  jobId: string;
  stage: AdGenerationStage;
  progress: number;
  message?: string;

  // Stage-specific data
  scrapedContent?: any;
  researchSummary?: string;
  adIdeas?: any[];
  generatedImages?: string[];

  // Error handling
  error?: string;
  errorCode?: string;

  // Timing
  startTime?: Date;
  stageStartTime?: Date;
  stepTimings: StepTiming[]; // Track all completed steps
  currentStepStartTime?: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: MessageType;
  content: string;
  timestamp: Date;
  icon?: string;

  // Optional data for different message types
  adData?: AdGenerationData;
  agentData?: AgentBubbleData;
  imageUrls?: string[];
  isTemporary?: boolean;
}

interface ChatState {
  messages: ChatMessage[];

  // Current ad generation job
  currentJob: AdGenerationData | null;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  removeMessage: (id: string) => void;

  // Ad generation specific actions
  startAdGeneration: (jobId: string, userMessage: string) => void;
  updateAdGeneration: (jobId: string, stage: AdGenerationStage, data?: Partial<AdGenerationData>) => void;
  completeAdGenerationStep: (jobId: string, stage: AdGenerationStage, message: string, data?: any) => void;
  addGeneratedImage: (jobId: string, imageUrl: string) => void;
  setAdGenerationError: (jobId: string, error: string, errorCode?: string) => void;
  completeAdGeneration: (jobId: string, images?: string[]) => void;

  // Image handling
  addImageToChat: (messageId: string, imageUrl: string, addToCanvas?: boolean) => void;
  addImagesToChatAndCanvas: (messageId: string, imageUrls: string[]) => void;

  // Agent bubble specific actions
  addAgentBubble: (type: AgentBubbleType, title: string, icon: string, jobId: string, gradient?: string) => string;
  updateAgentBubble: (id: string, updates: Partial<AgentBubbleData>) => void;
  addAgentBubbleSection: (bubbleId: string, section: Omit<AgentBubbleSection, 'id'>) => string;
  updateAgentBubbleSection: (bubbleId: string, sectionId: string, updates: Partial<AgentBubbleSection>) => void;
  completeAgentBubble: (bubbleId: string) => void;
  addTemporaryMessage: (content: string, icon: string) => string;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentJob: null,

  addMessage: (message) => {
    const id = uuidv4();
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, newMessage]
    }));

    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
  },

  clearMessages: () => {
    set({ messages: [], currentJob: null });
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter(msg => msg.id !== id)
    }));
  },

  startAdGeneration: (jobId, userMessage) => {
    const adData: AdGenerationData = {
      jobId,
      stage: 'thinking',
      progress: 0,
      startTime: new Date(),
      stageStartTime: new Date(),
      stepTimings: [],
      currentStepStartTime: new Date(),
    };

    // Add user message
    get().addMessage({
      role: 'user',
      type: 'text',
      content: userMessage,
    });

    // Add ad generation message
    const messageId = get().addMessage({
      role: 'assistant',
      type: 'ad_generation',
      content: 'Starting ad generation...',
      adData,
    });

    set({ currentJob: adData });
    return messageId;
  },

  updateAdGeneration: (jobId, stage, data = {}) => {
    set((state) => {
      if (!state.currentJob || state.currentJob.jobId !== jobId) {
        return state;
      }

      const updatedJob: AdGenerationData = {
        ...state.currentJob,
        stage,
        currentStepStartTime: new Date(),
        ...data,
      };

      const updatedMessages = state.messages.map(msg => {
        if (msg.type === 'ad_generation' && msg.adData?.jobId === jobId) {
          return {
            ...msg,
            adData: updatedJob,
          };
        }
        return msg;
      });

      return {
        currentJob: updatedJob,
        messages: updatedMessages,
      };
    });
  },

  completeAdGenerationStep: (jobId, stage, message, data) => {
    set((state) => {
      if (!state.currentJob || state.currentJob.jobId !== jobId) {
        return state;
      }

      const now = new Date();
      const stepStartTime = state.currentJob.currentStepStartTime || now;
      const duration = now.getTime() - stepStartTime.getTime();

      // Create step timing record
      const stepTiming: StepTiming = {
        stage,
        startTime: stepStartTime,
        endTime: now,
        duration,
        message,
        data,
      };

      // Add persistent step completion message
      const stepMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        type: 'ad_step_complete',
        content: message,
        timestamp: now,
        adData: {
          ...state.currentJob,
          stepTimings: [...state.currentJob.stepTimings, stepTiming],
        },
      };

      // Update current job with completed step
      const updatedJob: AdGenerationData = {
        ...state.currentJob,
        stepTimings: [...state.currentJob.stepTimings, stepTiming],
        currentStepStartTime: now, // Ready for next step
      };

      return {
        currentJob: updatedJob,
        messages: [...state.messages, stepMessage],
      };
    });
  },

  addGeneratedImage: (jobId, imageUrl) => {
    set((state) => {
      if (!state.currentJob || state.currentJob.jobId !== jobId) {
        return state;
      }

      const updatedJob: AdGenerationData = {
        ...state.currentJob,
        generatedImages: [
          ...(state.currentJob.generatedImages || []),
          imageUrl,
        ],
      };

      const updatedMessages = state.messages.map(msg => {
        if (msg.type === 'ad_generation' && msg.adData?.jobId === jobId) {
          return {
            ...msg,
            adData: updatedJob,
          };
        }
        return msg;
      });

      return {
        currentJob: updatedJob,
        messages: updatedMessages,
      };
    });
  },

  setAdGenerationError: (jobId, error, errorCode) => {
    get().updateAdGeneration(jobId, 'error', {
      error,
      errorCode,
    });
  },

  completeAdGeneration: (jobId, images) => {
    get().updateAdGeneration(jobId, 'completed', {
      progress: 100,
      generatedImages: images,
    });
  },

  // Agent bubble specific actions
  addAgentBubble: (type, title, icon, jobId, gradient) => {
    const id = uuidv4();
    const newMessage: ChatMessage = {
      id,
      role: 'assistant',
      type: 'agent_bubble',
      content: title,
      timestamp: new Date(),
      icon,
      agentData: {
        type,
        title,
        icon,
        jobId,
        gradient,
        startTime: new Date(),
        sections: [],
        isCompleted: false
      }
    };

    set((state) => ({
      messages: [...state.messages, newMessage]
    }));

    return id;
  },

  updateAgentBubble: (id, updates) => {
    set((state) => ({
      messages: state.messages.map(msg => {
        if (msg.id === id && msg.type === 'agent_bubble' && msg.agentData) {
          return {
            ...msg,
            agentData: {
              ...msg.agentData,
              ...updates
            }
          };
        }
        return msg;
      })
    }));
  },

  addAgentBubbleSection: (bubbleId, section) => {
    const sectionId = uuidv4();

    set((state) => {
      const updatedMessages = state.messages.map(msg => {
        if (msg.id === bubbleId && msg.type === 'agent_bubble' && msg.agentData) {
          const newSection: AgentBubbleSection = {
            id: sectionId,
            ...section
          };

          return {
            ...msg,
            agentData: {
              ...msg.agentData,
              sections: [...msg.agentData.sections, newSection]
            }
          };
        }
        return msg;
      });

      return { messages: updatedMessages };
    });

    return sectionId;
  },

  updateAgentBubbleSection: (bubbleId, sectionId, updates) => {
    set((state) => {
      const updatedMessages = state.messages.map(msg => {
        if (msg.id === bubbleId && msg.type === 'agent_bubble' && msg.agentData) {
          const updatedSections = msg.agentData.sections.map(section =>
            section.id === sectionId ? { ...section, ...updates } : section
          );

          return {
            ...msg,
            agentData: {
              ...msg.agentData,
              sections: updatedSections
            }
          };
        }
        return msg;
      });

      return { messages: updatedMessages };
    });
  },

  completeAgentBubble: (bubbleId) => {
    const now = new Date();

    set((state) => {
      const updatedMessages = state.messages.map(msg => {
        if (msg.id === bubbleId && msg.type === 'agent_bubble' && msg.agentData) {
          const startTime = msg.agentData.startTime;
          const duration = now.getTime() - startTime.getTime();

          return {
            ...msg,
            agentData: {
              ...msg.agentData,
              isCompleted: true,
              endTime: now,
              duration
            }
          };
        }
        return msg;
      });

      return { messages: updatedMessages };
    });
  },

  addTemporaryMessage: (content, icon) => {
    const id = uuidv4();
    const newMessage: ChatMessage = {
      id,
      role: 'assistant',
      type: 'temporary_status',
      content,
      timestamp: new Date(),
      icon,
      isTemporary: true
    };

    set((state) => ({
      messages: [...state.messages, newMessage]
    }));

    return id;
  },

  // Add a single image to a chat message and optionally to the canvas
  addImageToChat: (messageId, imageUrl, addToCanvas = true) => {
    // Update the message with the new image URL
    set((state) => {
      const updatedMessages = state.messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            imageUrls: [...(msg.imageUrls || []), imageUrl]
          };
        }
        return msg;
      });

      return { messages: updatedMessages };
    });

    // Add the image to the canvas if requested
    if (addToCanvas) {
      // Import canvas utils to handle image placement
      import('@/components/playground/chat-panel/utils/canvas-utils').then(({ addImagesToCanvas }) => {
        // Add the image to the canvas with proper positioning
        addImagesToCanvas([imageUrl], true);
      }).catch(error => {
        console.error('Error importing canvas utils:', error);

        // Fallback to direct canvas store access if import fails
        const { addImage } = require('@/store/canvasStore').useCanvasStore.getState();
        const x = 20;
        const y = 20;
        addImage(imageUrl, x, y, true);
      });
    }
  },

  // Add multiple images to chat and canvas
  addImagesToChatAndCanvas: (messageId, imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return;

    // Update the message with all new image URLs
    set((state) => {
      const updatedMessages = state.messages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            imageUrls: [...(msg.imageUrls || []), ...imageUrls]
          };
        }
        return msg;
      });

      return { messages: updatedMessages };
    });

    // Add all images to the canvas using the canvas utils
    import('@/components/playground/chat-panel/utils/canvas-utils').then(({ addImagesToCanvas }) => {
      // Add the images to the canvas with proper positioning
      addImagesToCanvas(imageUrls, false); // Start a new row for multiple images
    }).catch(error => {
      console.error('Error importing canvas utils:', error);

      // Fallback to direct canvas store access if import fails
      const { addImage } = require('@/store/canvasStore').useCanvasStore.getState();

      // Add each image to the canvas with proper spacing
      imageUrls.forEach((url, index) => {
        // Position images in a row with 40px gap
        const x = 20 + index * (512 + 40);
        const y = 20;

        // Add the image to the canvas, marking it as a generated image
        addImage(url, x, y, true);
      });
    });
  }
}));