import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useProjectStore } from '@/store/projectStore';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  },
}));

describe('Project Store', () => {
  // Reset the store before each test
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      isLoading: false,
      error: null,
      lastFetched: null,
    });
    
    // Clear all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch projects successfully', async () => {
    // Mock successful response
    const mockProjects = [
      {
        id: '1',
        name: 'Test Project 1',
        description: 'Test Description 1',
        user_id: 'default-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        thumbnail_url: null,
        session_id: 'abc123',
      },
      {
        id: '2',
        name: 'Test Project 2',
        description: 'Test Description 2',
        user_id: 'default-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        thumbnail_url: null,
        session_id: 'def456',
      },
    ];
    
    // Setup the mock
    supabase.from = vi.fn().mockReturnThis();
    supabase.select = vi.fn().mockReturnThis();
    supabase.eq = vi.fn().mockReturnThis();
    supabase.order = vi.fn().mockReturnValue({
      data: mockProjects,
      error: null,
    });
    
    // Call the fetch function
    await useProjectStore.getState().fetchProjects();
    
    // Check if the store was updated correctly
    expect(useProjectStore.getState().projects).toEqual(mockProjects);
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBe(null);
    expect(useProjectStore.getState().lastFetched).not.toBe(null);
    
    // Verify the Supabase calls
    expect(supabase.from).toHaveBeenCalledWith('projects');
    expect(supabase.select).toHaveBeenCalledWith('*');
    expect(supabase.eq).toHaveBeenCalledWith('user_id', 'default-user');
    expect(supabase.order).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('should handle fetch error', async () => {
    // Mock error response
    const mockError = new Error('Failed to fetch projects');
    
    // Setup the mock
    supabase.from = vi.fn().mockReturnThis();
    supabase.select = vi.fn().mockReturnThis();
    supabase.eq = vi.fn().mockReturnThis();
    supabase.order = vi.fn().mockReturnValue({
      data: null,
      error: mockError,
    });
    
    // Call the fetch function
    await useProjectStore.getState().fetchProjects();
    
    // Check if the store was updated correctly
    expect(useProjectStore.getState().projects).toEqual([]);
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBe(mockError.message);
  });

  it('should create a project successfully', async () => {
    // Mock successful response
    const mockProject = {
      id: '3',
      name: 'New Project',
      description: 'New Description',
      user_id: 'default-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      thumbnail_url: null,
      session_id: 'ghi789',
    };
    
    // Setup the mock
    supabase.from = vi.fn().mockReturnThis();
    supabase.insert = vi.fn().mockReturnThis();
    supabase.select = vi.fn().mockReturnThis();
    supabase.single = vi.fn().mockReturnValue({
      data: mockProject,
      error: null,
    });
    
    // Call the create function
    const result = await useProjectStore.getState().createProject({
      name: 'New Project',
      description: 'New Description',
      user_id: 'default-user',
      session_id: 'ghi789',
    });
    
    // Check if the store was updated correctly
    expect(result).toEqual(mockProject);
    expect(useProjectStore.getState().projects).toEqual([mockProject]);
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBe(null);
    
    // Verify the Supabase calls
    expect(supabase.from).toHaveBeenCalledWith('projects');
    expect(supabase.insert).toHaveBeenCalled();
    expect(supabase.select).toHaveBeenCalled();
    expect(supabase.single).toHaveBeenCalled();
  });

  it('should handle create error', async () => {
    // Mock error response
    const mockError = new Error('Failed to create project');
    
    // Setup the mock
    supabase.from = vi.fn().mockReturnThis();
    supabase.insert = vi.fn().mockReturnThis();
    supabase.select = vi.fn().mockReturnThis();
    supabase.single = vi.fn().mockReturnValue({
      data: null,
      error: mockError,
    });
    
    // Call the create function
    const result = await useProjectStore.getState().createProject({
      name: 'New Project',
      description: 'New Description',
      user_id: 'default-user',
    });
    
    // Check if the store was updated correctly
    expect(result).toBe(null);
    expect(useProjectStore.getState().projects).toEqual([]);
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBe(mockError.message);
  });
});
