import { Project, ProjectCreate } from '@/types/project';

// Try to load projects from localStorage
const loadMockProjects = (): Project[] => {
  if (typeof window !== 'undefined') {
    try {
      const savedProjects = localStorage.getItem('mock-supabase-projects');
      if (savedProjects) {
        console.log('[MockSupabase] Loading projects from localStorage');
        return JSON.parse(savedProjects);
      }
    } catch (error) {
      console.error('[MockSupabase] Error loading from localStorage:', error);
    }
  }

  // Default mock data
  return [
    {
      id: '1',
      name: 'Ad Campaign for Nike',
      description: 'Sports shoe marketing campaign with dynamic visuals',
      thumbnail_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      user_id: 'default-user',
      session_id: 'abc123',
    },
    {
      id: '2',
      name: 'Coffee Shop Promotion',
      description: 'Artisanal coffee brand marketing materials',
      thumbnail_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      user_id: 'default-user',
      session_id: 'def456',
    },
    {
      id: '3',
      name: 'Tech Gadget Launch',
      description: 'New smartphone product announcement campaign',
      thumbnail_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      user_id: 'default-user',
      session_id: 'ghi789',
    },
  ];
};

// Initialize mock projects
let mockProjects: Project[] = loadMockProjects();

// Save projects to localStorage
const saveMockProjects = () => {
  if (typeof window !== 'undefined') {
    try {
      console.log('[MockSupabase] Saving projects to localStorage');
      localStorage.setItem('mock-supabase-projects', JSON.stringify(mockProjects));
    } catch (error) {
      console.error('[MockSupabase] Error saving to localStorage:', error);
    }
  }
};

// Mock Supabase client
export const mockSupabase = {
  from: (table: string) => {
    console.log(`[MockSupabase] Table operation: ${table}`);

    if (table === 'projects') {
      return {
        select: (columns = '*') => {
          console.log(`[MockSupabase] Select operation: ${columns}`);
          return {
            eq: (field: string, value: string) => {
              console.log(`[MockSupabase] Filter: ${field} = ${value}`);
              return {
                order: (field: string, { ascending }: { ascending: boolean }) => {
                  console.log(`[MockSupabase] Order by: ${field}, ascending: ${ascending}`);
                  const filteredProjects = mockProjects.filter(p => p.user_id === value);
                  const sortedProjects = [...filteredProjects].sort((a, b) => {
                    if (field === 'updated_at') {
                      return ascending
                        ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
                        : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                    }
                    return 0;
                  });

                  console.log(`[MockSupabase] Returning ${sortedProjects.length} projects`);
                  return {
                    data: sortedProjects,
                    error: null,
                  };
                },
              };
            },
          };
        },

        insert: (projects: ProjectCreate[]) => {
          console.log(`[MockSupabase] Insert operation:`, projects);
          return {
            select: () => ({
              single: () => {
                const newProject: Project = {
                  id: Math.random().toString(36).substring(2, 9),
                  ...projects[0],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  thumbnail_url: projects[0].thumbnail_url || '',
                };

                mockProjects.unshift(newProject);
                saveMockProjects();

                console.log(`[MockSupabase] Created project:`, newProject);
                return {
                  data: newProject,
                  error: null,
                };
              },
            }),
          };
        },

        update: (updates: Partial<Project>) => {
          console.log(`[MockSupabase] Update operation:`, updates);
          return {
            eq: (field: string, value: string) => {
              console.log(`[MockSupabase] Update filter: ${field} = ${value}`);
              return {
                eq: (field2: string, value2: string) => {
                  console.log(`[MockSupabase] Additional filter: ${field2} = ${value2}`);
                  return {
                    select: () => ({
                      single: () => {
                        const index = mockProjects.findIndex(p => (p[field as keyof Project] === value) && (p[field2 as keyof Project] === value2));

                        if (index === -1) {
                          console.log(`[MockSupabase] Project not found for update`);
                          return {
                            data: null,
                            error: { message: 'Project not found' },
                          };
                        }

                        const updatedProject = {
                          ...mockProjects[index],
                          ...updates,
                          updated_at: new Date().toISOString(),
                        };

                        mockProjects[index] = updatedProject;
                        saveMockProjects();

                        console.log(`[MockSupabase] Updated project:`, updatedProject);
                        return {
                          data: updatedProject,
                          error: null,
                        };
                      },
                    }),
                  };
                },
              };
            },
          };
        },

        delete: () => {
          console.log(`[MockSupabase] Delete operation`);
          return {
            eq: (field: string, value: string) => {
              console.log(`[MockSupabase] Delete filter: ${field} = ${value}`);
              return {
                eq: (field2: string, value2: string) => {
                  console.log(`[MockSupabase] Additional filter: ${field2} = ${value2}`);

                  const index = mockProjects.findIndex(p => (p[field as keyof Project] === value) && (p[field2 as keyof Project] === value2));

                  if (index === -1) {
                    console.log(`[MockSupabase] Project not found for deletion`);
                    return {
                      error: { message: 'Project not found' },
                    };
                  }

                  mockProjects.splice(index, 1);
                  saveMockProjects();

                  console.log(`[MockSupabase] Deleted project at index ${index}`);
                  return {
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    }

    return {};
  },
};
