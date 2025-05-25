"use client";

import { Project } from '@/types/project';
import Link from 'next/link';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { createPortal } from 'react-dom';
import { ThumbnailGrid } from './thumbnail-grid';

interface ProjectCardProps {
  project?: Project;
  isCreateCard?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
}

export function ProjectCard({ project, isCreateCard = false, onClick, isLoading = false }: ProjectCardProps) {
  const router = useRouter();
  const { deleteProject } = useProjectStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);

  // Handle modal effects (keyboard, body scroll)
  useEffect(() => {
    if (showDeleteModal) {
      // Prevent body scrolling
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';

      // Handle escape key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleDeleteCancel();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showDeleteModal]);

  const handleClick = () => {
    if (isLoading || isDeleting) return;

    if (isCreateCard && onClick) {
      onClick();
      return;
    }

    if (project?.id) {
      // Use project ID for navigation instead of session_id
      router.push(`/playground/${project.id}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!project?.id || isDeleting) return;

    setIsDeleting(true);
    try {
      const success = await deleteProject(project.id);
      if (success) {
        setShowDeleteModal(false);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setShowDeleteModal(false);
      setIsModalClosing(false);
    }, 150); // Match animation duration
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleDeleteCancel();
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
        <div className="transition delay-40 duration-200 ease-in-out hover:shadow-[4px 1px 12px 0px #0000001A] aspect-square hover:-translate-y-1 hover:-rotate-1 rounded-sm bg-gray-50 flex items-center justify-center  shadow-[0px_1px_2px_#00000026,0px_0px_0.5px_#0000004c]">
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
    <>
      <div
        onClick={handleClick}
        className="rounded-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-200 flex flex-col h-full w-full group relative"
      >
      {/* Thumbnail - 1:1 aspect ratio with 2x2 image grid */}
      <div className="transition delay-40 duration-200 ease-in-out aspect-square relative overflow-hidden rounded-sm shadow-[0px_1px_2px_#00000026,0px_0px_0.5px_#0000004c] hover:-translate-y-1 hover:-rotate-1">
        <ThumbnailGrid
          projectId={project.id}
          className="w-full h-full"
        />

        {/* Delete button - positioned at bottom-left corner of thumbnail */}
        <button
          onClick={handleDeleteClick}
          className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-white/90 backdrop-blur-sm hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all duration-200 shadow-sm"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">{project.name}</h3>
          {/* Footer with date and action */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col">
              <span className="text-xs text-gray-600">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-900 flex items-center gap-1 font-medium">
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal using portal */}
      {showDeleteModal && typeof window !== 'undefined' && createPortal(
        <div
          className={`fixed inset-0 backdrop-blur-[8px] flex items-center justify-center z-[9999] transition-opacity duration-150 ease-in ${
            isModalClosing ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl max-w-[90vw] transform transition-transform duration-150 ease-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-modal-title"
              className="text-lg font-semibold text-gray-900 mb-4 text-center"
            >
              Do you want to delete your project?
            </h3>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDeleteCancel}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
                disabled={isDeleting}
                autoFocus
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
