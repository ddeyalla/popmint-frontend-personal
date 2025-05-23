"use client";

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { ProjectCard } from './project-card';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function ProjectSection() {
  const router = useRouter();
  const {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    clearError
  } = useProjectStore();
  const [isCreating, setIsCreating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch projects on initial load and when retry is triggered
  useEffect(() => {
    console.log('[ProjectSection] Initializing, fetching projects...');
    fetchProjects().catch(err => {
      console.error('[ProjectSection] Error in initial fetch:', err);
    });
  }, [fetchProjects, retryCount]);

  // Handle project creation
  const handleCreateProject = async () => {
    if (isCreating) return;

    console.log('[ProjectSection] Creating new project...');
    setIsCreating(true);
    try {
      // Generate a session ID for the new project
      const sessionId = Math.random().toString(36).substring(2, 9);

      // Create a new project
      const newProject = await createProject({
        name: "Untitled Project",
        description: "Created on " + new Date().toLocaleDateString(),
        user_id: 'default-user',
        session_id: sessionId,
        thumbnail_url: undefined,
      });

      if (newProject) {
        console.log('[ProjectSection] Project created successfully, navigating to:', sessionId);
        // Navigate to the new project
        router.push(`/playground/${sessionId}`);
      } else {
        console.error('[ProjectSection] Project creation returned null');
      }
    } catch (error) {
      console.error('[ProjectSection] Error creating project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle retry when loading fails
  const handleRetry = () => {
    console.log('[ProjectSection] Retrying project fetch...');
    clearError();
    setRetryCount(prev => prev + 1);
  };

  return (
    <section className="w-full max-w-none px-8 py-8 bg-white/80 bg-opacity-80 backdrop-blur-xl rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span>Your Projects</span>
        </h2>
        <button 
          onClick={handleRetry} 
          className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Loading state - initial load */}
      {isLoading && !projects.length ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        /* Error state */
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-700 mb-1">Failed to load projects</h3>
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button
                onClick={handleRetry}
                className="text-sm font-medium text-red-700 hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Projects grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
          {/* Create New Project card - always first */}
          <ProjectCard
            isCreateCard={true}
            onClick={handleCreateProject}
            isLoading={isCreating}
          />

          {/* Project cards */}
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}

          {/* Loading skeleton cards */}
          {isLoading && projects.length > 0 && (
            <>
              <div className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[16/9] bg-gray-200"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
