import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { Project, ProjectCreate } from '@/types/project';
import { apiCall, withRetry } from '@/lib/persistence-utils';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Current project state for persistence
  currentProjectId: string | null;
  currentJobId: string | null;
  isHydrating: boolean;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (project: ProjectCreate) => Promise<Project | null>;
  getProject: (id: string) => Project | undefined;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  clearError: () => void;

  // New persistence actions
  createProjectFromPrompt: (prompt: string) => Promise<string | null>;
  linkJobToProject: (projectId: string, jobId: string) => Promise<boolean>;
  setCurrentProject: (projectId: string) => void;
  setCurrentJob: (jobId: string) => void;
  hydrateProject: (projectId: string) => Promise<boolean>;
}

// For demo purposes, we'll use a default user ID
// In a real app, this would come from authentication
const DEFAULT_USER_ID = 'default-user';

// Create a store with persistence
export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      isLoading: false,
      error: null,
      lastFetched: null,
      currentProjectId: null,
      currentJobId: null,
      isHydrating: false,

      fetchProjects: async () => {
        console.log('[ProjectStore] Fetching projects...');

        // Check if we've fetched recently (within last minute) to avoid unnecessary fetches
        const now = Date.now();
        const lastFetched = get().lastFetched;
        if (lastFetched && now - lastFetched < 60000 && get().projects.length > 0) {
          console.log('[ProjectStore] Using cached projects, last fetched at:', new Date(lastFetched).toISOString());
          return;
        }

        set({ isLoading: true, error: null });
        try {
          // Fetch projects from Supabase
          console.log('[ProjectStore] Requesting projects from Supabase for user:', DEFAULT_USER_ID);
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', DEFAULT_USER_ID)
            .order('updated_at', { ascending: false });

          if (error) {
            console.error('[ProjectStore] Supabase error:', error);
            throw error;
          }

          console.log(`[ProjectStore] Successfully fetched ${data?.length || 0} projects`);
          set({
            projects: data || [],
            isLoading: false,
            lastFetched: Date.now()
          });
        } catch (error) {
          console.error('[ProjectStore] Error fetching projects:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch projects',
            isLoading: false
          });
        }
      },

      createProject: async (project: ProjectCreate) => {
        console.log('[ProjectStore] Creating new project:', project.name);
        set({ isLoading: true, error: null });
        try {
          // Set default user ID if not provided
          const projectWithUser = {
            ...project,
            user_id: project.user_id || DEFAULT_USER_ID,
          };

          // Insert project into Supabase
          console.log('[ProjectStore] Sending create request to Supabase');
          const { data, error } = await supabase
            .from('projects')
            .insert([projectWithUser])
            .select()
            .single();

          if (error) {
            console.error('[ProjectStore] Supabase insert error:', error);
            throw error;
          }

          console.log('[ProjectStore] Project created successfully:', data);

          // Update local state with the new project
          set(state => ({
            projects: [data, ...state.projects],
            isLoading: false,
            lastFetched: Date.now()
          }));

          return data;
        } catch (error) {
          console.error('[ProjectStore] Error creating project:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create project',
            isLoading: false
          });
          return null;
        }
      },

      getProject: (id: string) => {
        console.log(`[ProjectStore] Getting project with ID: ${id}`);
        const project = get().projects.find(project => project.id === id);
        console.log(`[ProjectStore] Project found:`, project ? 'Yes' : 'No');
        return project;
      },

      updateProject: async (id: string, updates: Partial<Project>) => {
        console.log(`[ProjectStore] Updating project ${id} with:`, updates);
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id)
            .eq('user_id', DEFAULT_USER_ID)
            .select()
            .single();

          if (error) {
            console.error('[ProjectStore] Update error:', error);
            throw error;
          }

          console.log('[ProjectStore] Project updated successfully:', data);

          // Update the project in the local state
          set(state => ({
            projects: state.projects.map(p => p.id === id ? data : p),
            isLoading: false,
            lastFetched: Date.now()
          }));

          return data;
        } catch (error) {
          console.error('[ProjectStore] Error updating project:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update project',
            isLoading: false
          });
          return null;
        }
      },

      deleteProject: async (id: string) => {
        console.log(`[ProjectStore] Deleting project ${id}`);
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', DEFAULT_USER_ID);

          if (error) {
            console.error('[ProjectStore] Delete error:', error);
            throw error;
          }

          console.log('[ProjectStore] Project deleted successfully');

          // Remove the project from the local state
          set(state => ({
            projects: state.projects.filter(p => p.id !== id),
            isLoading: false
          }));

          return true;
        } catch (error) {
          console.error('[ProjectStore] Error deleting project:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to delete project',
            isLoading: false
          });
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      // New persistence methods
      createProjectFromPrompt: async (prompt: string) => {
        console.log('[ProjectStore] Creating project from prompt:', prompt);
        set({ isLoading: true, error: null });

        try {
          // Extract project name from prompt (first 3 words)
          const words = prompt.trim().split(/\s+/);
          const projectName = words.slice(0, 3).join(' ') || 'Untitled Project';

          // Create project via API
          const response = await apiCall<{ project_id: string; project: Project }>('/api/projects', {
            method: 'POST',
            body: JSON.stringify({
              name: projectName,
              description: prompt,
              thumbnail_url: '',
            }),
          });

          // Update local state
          set((state) => ({
            projects: [response.project, ...state.projects],
            currentProjectId: response.project_id,
            isLoading: false,
          }));

          console.log('[ProjectStore] Project created successfully:', response.project_id);
          return response.project_id;

        } catch (error) {
          console.error('[ProjectStore] Error creating project from prompt:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create project',
            isLoading: false,
          });
          return null;
        }
      },

      linkJobToProject: async (projectId: string, jobId: string) => {
        console.log('[ProjectStore] Linking job to project:', { projectId, jobId });

        try {
          await apiCall(`/api/projects/${projectId}/link-job`, {
            method: 'POST',
            body: JSON.stringify({ job_id: jobId }),
          });

          set({ currentJobId: jobId });
          console.log('[ProjectStore] Job linked successfully');
          return true;

        } catch (error) {
          console.error('[ProjectStore] Error linking job to project:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to link job to project',
          });
          return false;
        }
      },

      setCurrentProject: (projectId: string) => {
        console.log('[ProjectStore] Setting current project:', projectId);
        set({ currentProjectId: projectId });
      },

      setCurrentJob: (jobId: string) => {
        console.log('[ProjectStore] Setting current job:', jobId);
        set({ currentJobId: jobId });
      },

      hydrateProject: async (projectId: string) => {
        console.log('[ProjectStore] 🚀 Hydrating project:', projectId);
        console.log('[ProjectStore] 🔧 Starting hydration process...');
        set({ isHydrating: true, error: null });

        try {
          // First, try to get the project directly by ID
          console.log('[ProjectStore] Getting project by ID:', projectId);
          let actualProjectId = projectId;
          let projectExists = false;

          try {
            const response = await apiCall<{ project: any }>(`/api/projects/${projectId}`);
            if (response.project) {
              console.log('[ProjectStore] Project found by ID:', response.project.id);
              actualProjectId = response.project.id;
              projectExists = true;
            }
          } catch (getError) {
            console.log('[ProjectStore] Project not found by ID, trying by session ID:', getError);

            // If direct lookup fails, try by session ID (for backward compatibility)
            try {
              const sessionResponse = await apiCall<{ project_id: string }>(`/api/projects/by-session/${projectId}`);
              actualProjectId = sessionResponse.project_id;
              console.log('[ProjectStore] Project found/created by session ID, actual ID:', actualProjectId);
              projectExists = true;
            } catch (sessionError) {
              console.error('[ProjectStore] Failed to get/create project by session ID:', sessionError);
              // Continue anyway - we'll try to initialize persistence with the provided ID
            }
          }

          // Initialize auto-persistence for this project using the actual project ID
          console.log('[ProjectStore] 🔧 Importing auto-persistence...');
          const { initializeAutoPersistence } = await import('@/lib/auto-persistence');
          console.log('[ProjectStore] 🚀 Initializing auto-persistence for project:', actualProjectId);
          const success = await initializeAutoPersistence(actualProjectId);
          console.log('[ProjectStore] 📊 Auto-persistence initialization result:', success);

          if (!success) {
            console.warn('[ProjectStore] Auto-persistence initialization failed, but continuing');
            // Don't throw error - allow the app to continue without persistence
          }

          set({
            currentProjectId: actualProjectId,
            isHydrating: false,
          });

          console.log('[ProjectStore] Project hydrated successfully');
          return true;

        } catch (error) {
          console.error('[ProjectStore] Error hydrating project:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to hydrate project',
            isHydrating: false,
          });
          return false;
        }
      },
    }),
    {
      name: 'popmint-projects-storage', // unique name for localStorage
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        currentJobId: state.currentJobId,
      }),
    }
  )
);
