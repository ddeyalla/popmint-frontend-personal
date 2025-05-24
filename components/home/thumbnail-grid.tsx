"use client";

import { useState, useEffect } from 'react';

interface ThumbnailGridProps {
  projectId: string;
  className?: string;
}

interface ProjectImage {
  images: string[];
  total: number;
}

export function ThumbnailGrid({ projectId, className = '' }: ThumbnailGridProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchImages() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/projects/${projectId}/images`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.status}`);
        }

        const data: ProjectImage = await response.json();
        setImages(data.images || []);
      } catch (err) {
        console.error('[ThumbnailGrid] Error fetching images:', err);
        setError(err instanceof Error ? err.message : 'Failed to load images');
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchImages();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className={`thumbnail-grid ${className}`}>
        {/* Loading state with 4 placeholder cells */}
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid-cell placeholder animate-pulse bg-gray-200"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`thumbnail-grid ${className}`}>
        {/* Error state with 4 placeholder cells */}
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="grid-cell placeholder bg-gray-100 flex items-center justify-center"
          >
            {index === 0 && (
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`thumbnail-grid ${className}`}>
      {Array.from({ length: 4 }).map((_, index) => {
        const imageUrl = images[index];
        
        if (imageUrl) {
          return (
            <img
              key={index}
              src={imageUrl}
              alt={`Project preview image ${index + 1}`}
              className="grid-cell"
              onError={(e) => {
                // Hide broken image and show placeholder
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'grid-cell placeholder bg-gray-100';
                  parent.appendChild(placeholder);
                }
              }}
            />
          );
        } else {
          return (
            <div
              key={index}
              className="grid-cell placeholder bg-gray-100"
            />
          );
        }
      })}
    </div>
  );
}

// Update project thumbnail using the grid approach
export function updateProjectThumbnail(cardEl: HTMLElement, imageUrls: string[]) {
  const grid = cardEl.querySelector('.thumbnail-grid');
  if (!grid) return;

  grid.innerHTML = '';
  
  for (let i = 0; i < 4; i++) {
    const cell = document.createElement('img');
    cell.className = 'grid-cell';
    
    if (imageUrls[i]) {
      cell.src = imageUrls[i];
      cell.alt = 'Project preview image';
    } else {
      cell.classList.add('placeholder');
      cell.alt = '';
    }
    
    grid.appendChild(cell);
  }
}
