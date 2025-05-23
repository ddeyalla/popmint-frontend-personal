import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { Project, ProjectCreate } from '@/types/project';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (project: ProjectCreate) => Promise<Project | null>;
  getProject: (id: string) => Project | undefined;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  clearError: () => void;
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
      }
    }),
    {
      name: 'popmint-projects-storage', // unique name for localStorage
      partialize: (state) => ({ projects: state.projects }), // only persist projects array
    }
  )
);
