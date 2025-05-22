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
  | 'agent_progress'
  | 'agent_output'
  | 'error';

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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: MessageType;
  content: string;
  timestamp: Date;
  
  // Optional data for ad generation messages
  adData?: AdGenerationData;
  imageUrls?: string[];
}

interface ChatState {
  messages: ChatMessage[];
  
  // Current ad generation job
  currentJob: AdGenerationData | null;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  
  // Ad generation specific actions
  startAdGeneration: (jobId: string, userMessage: string) => void;
  updateAdGeneration: (jobId: string, stage: AdGenerationStage, data?: Partial<AdGenerationData>) => void;
  addGeneratedImage: (jobId: string, imageUrl: string) => void;
  setAdGenerationError: (jobId: string, error: string, errorCode?: string) => void;
  completeAdGeneration: (jobId: string, images?: string[]) => void;
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

  startAdGeneration: (jobId, userMessage) => {
    const adData: AdGenerationData = {
      jobId,
      stage: 'thinking',
      progress: 0,
      startTime: new Date(),
      stageStartTime: new Date(),
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
        stageStartTime: new Date(),
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
})); 