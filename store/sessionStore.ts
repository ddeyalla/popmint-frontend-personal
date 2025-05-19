import { create } from "zustand"

interface SessionState {
  sessionId: string | null
  projectName: string
  setSessionId: (id: string) => void
  setProjectName: (name: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  projectName: "Untitled Project",
  setSessionId: (id) => set({ sessionId: id }),
  setProjectName: (name) => set({ projectName: name }),
}))
