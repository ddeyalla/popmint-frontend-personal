import { create } from "zustand"
import { persist } from "zustand/middleware"

interface JobProjectMapping {
  [jobId: string]: string;
}

interface SessionState {
  sessionId: string | null;
  projectName: string;
  jobProjectMappings: JobProjectMapping;
  setSessionId: (id: string) => void;
  setProjectName: (name: string) => void;
  mapJobIdToProject: (jobId: string, projectName: string) => void;
  getProjectNameByJobId: (jobId: string) => string | null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      projectName: "Untitled Project",
      jobProjectMappings: {},
      setSessionId: (id) => set({ sessionId: id }),
      setProjectName: (name) => set({ projectName: name }),
      mapJobIdToProject: (jobId, projectName) =>
        set((state) => ({
          jobProjectMappings: {
            ...state.jobProjectMappings,
            [jobId]: projectName
          }
        })),
      getProjectNameByJobId: (jobId) => {
        const state = get();
        return state.jobProjectMappings[jobId] || null;
      }
    }),
    {
      name: "popmint-session-storage",
      partialize: (state) => ({
        jobProjectMappings: state.jobProjectMappings
      }),
    }
  )
)
