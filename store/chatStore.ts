import { create } from "zustand"

export type MessageType =
  | "userInput"
  | "agentRequest"
  | "agentProgress"
  | "agentHandover"
  | "agentOutput"
  | "agentUpdate"

export interface ChatMessage {
  id: string
  type: MessageType
  content: string
  timestamp: Date
  subType?: "text" | "ad_concept" | "image_generated"
  imageUrls?: string[]
  options?: string[]
  details?: string
  status?: "completed" | "error"
  duration?: string
}

interface ChatState {
  messages: ChatMessage[]
  agentStatus: string
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void
  setAgentStatus: (status: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  agentStatus: "idle",
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date(),
        },
      ],
    })),
  setAgentStatus: (status) => set({ agentStatus: status }),
}))
