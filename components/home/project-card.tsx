"use client";

import { Project } from '@/types/project';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project?: Project;
  isCreateCard?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
}

export function ProjectCard({ project, isCreateCard = false, onClick, isLoading = false }: ProjectCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (isLoading) return;

    if (isCreateCard && onClick) {
      onClick();
      return;
    }

    if (project?.id) {
      // Use project ID for navigation instead of session_id
      router.push(`/playground/${project.id}`);
    }
  };

  // Create New Project card
  if (isCreateCard) {
    return (
      <div
        onClick={handleClick}
        className={`rounded-lg h-full w-full flex flex-col cursor-pointer transition-all duration-200 ${
          isLoading
            ? 'opacity-70 pointer-events-none'
            : 'hover:shadow-md hover:border-slate-200'
        }`}
      >
        {/* Empty thumbnail area with same aspect ratio */}
        <div className="transition delay-40 duration-200 ease-in-out hover:shadow-[4px 1px 12px 0px #0000001A] aspect-[16/9] hover:-translate-y-1 hover:-rotate-1 rounded-sm bg-gray-50 flex items-center justify-center  shadow-[0px_1px_2px_#00000026,0px_0px_0.5px_#0000004c]">
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Plus className="w-10 h-10 text-gray-400" />
          )}
        </div>

        {/* Content area */}
        <div className="p-2 flex-1 flex flex-col items-center justify-center">
          <h3 className="font-medium text-sm text-gray-900 text-center">
            {isLoading ? 'Creating Project...' : 'Create new project'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 text-center">
            {isLoading ? 'Please wait' : ''}
          </p>
        </div>
      </div>
    );
  }

  // Regular project card
  if (!project) return null;

  // Format the date to show "Last edited" info
  const lastEdited = new Date(project.updated_at);
  const formattedDate = lastEdited.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div
      onClick={handleClick}
      className="rounded-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-200 flex flex-col h-full w-full"
    >
      {/* Thumbnail - 16:9 aspect ratio */}
      <div className="transition delay-40 duration-200 ease-in-out aspect-[16/9] relative overflow-hidden rounded-sm shadow-[0px_1px_2px_#00000026,0px_0px_0.5px_#0000004c] hover:-translate-y-1 hover:-rotate-1">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.name}
            className="w-full h-full object-cover rounded-t-lg"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <span className="text-gray-400 text-sm">No preview</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{project.name}</h3>
        {/* Footer with date and action */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-xs text-gray-600">{formattedDate}</span>
          </div>
          <span className="text-xs text-slate-900 flex items-center gap-1 font-medium">
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
