import { useEffect, useRef, useCallback } from 'react';
import Konva from 'konva';
import { generateAndUploadThumbnail, withRetry } from '@/utils/thumbnail';

interface UseThumbnailOptions {
  projectId: string;
  stageRef: React.RefObject<Konva.Stage | null>;
  enabled?: boolean;
  debounceDelay?: number;
  onSuccess?: (thumbnailUrl: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for managing canvas thumbnail generation and upload
 * Handles debounced snapshot generation on canvas changes and navigation events
 */
export function useThumbnail({
  projectId,
  stageRef,
  enabled = true,
  debounceDelay = 2000,
  onSuccess,
  onError,
}: UseThumbnailOptions) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isGeneratingRef = useRef(false);
  const lastGenerationTimeRef = useRef<number>(0);
  const minGenerationIntervalRef = useRef(10000); // 10 seconds minimum between generations

  // Store latest values in refs to avoid stale closures
  const projectIdRef = useRef(projectId);
  const enabledRef = useRef(enabled);
  const debounceDelayRef = useRef(debounceDelay);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Update refs when props change
  useEffect(() => {
    projectIdRef.current = projectId;
    enabledRef.current = enabled;
    debounceDelayRef.current = debounceDelay;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [projectId, enabled, debounceDelay, onSuccess, onError]);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Generate thumbnail immediately (bypasses debounce)
   */
  const generateThumbnailNow = useCallback(async (): Promise<string | null> => {
    const currentEnabled = enabledRef.current;
    const currentProjectId = projectIdRef.current;

    if (!currentEnabled || !currentProjectId || !stageRef.current || isGeneratingRef.current) {
      console.log('[useThumbnail] Skipping generation:', {
        enabled: currentEnabled,
        projectId: !!currentProjectId,
        stage: !!stageRef.current,
        isGenerating: isGeneratingRef.current,
      });
      return null;
    }

    // Check minimum interval between generations
    const now = Date.now();
    const timeSinceLastGeneration = now - lastGenerationTimeRef.current;
    if (timeSinceLastGeneration < minGenerationIntervalRef.current) {
      console.log('[useThumbnail] Skipping generation due to rate limit:', {
        timeSinceLastGeneration,
        minInterval: minGenerationIntervalRef.current,
      });
      return null;
    }

    isGeneratingRef.current = true;
    lastGenerationTimeRef.current = now;

    try {
      console.log('[useThumbnail] Starting thumbnail generation for project:', currentProjectId);

      const thumbnailUrl = await withRetry(
        () => generateAndUploadThumbnail(stageRef.current!, currentProjectId),
        3,
        1000
      );

      console.log('[useThumbnail] Thumbnail generated successfully:', thumbnailUrl);
      onSuccessRef.current?.(thumbnailUrl);
      return thumbnailUrl;

    } catch (error) {
      const err = error as Error;
      console.error('[useThumbnail] Thumbnail generation failed:', err);
      onErrorRef.current?.(err);
      return null;
    } finally {
      isGeneratingRef.current = false;
    }
  }, [stageRef]); // Only depend on stageRef which is stable

  /**
   * Schedule a debounced thumbnail generation
   */
  const scheduleSnapshot = useCallback((delay?: number): void => {
    const currentEnabled = enabledRef.current;
    const currentProjectId = projectIdRef.current;

    if (!currentEnabled || !currentProjectId) {
      console.log('[useThumbnail] Skipping scheduled snapshot:', {
        enabled: currentEnabled,
        projectId: !!currentProjectId
      });
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const actualDelay = delay ?? debounceDelayRef.current;
    console.log('[useThumbnail] Scheduling snapshot in', actualDelay, 'ms');

    debounceTimerRef.current = setTimeout(() => {
      generateThumbnailNow().catch(error => {
        console.error('[useThumbnail] Scheduled generation failed:', error);
      });
    }, actualDelay);
  }, [generateThumbnailNow]); // Only depend on generateThumbnailNow which is now stable

  /**
   * Cancel any pending thumbnail generation
   */
  const cancelScheduledSnapshot = useCallback((): void => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      console.log('[useThumbnail] Cancelled scheduled snapshot');
    }
  }, []);

  // Set up beforeunload event listener for navigation-triggered snapshots
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const currentEnabled = enabledRef.current;
      const currentProjectId = projectIdRef.current;

      if (!currentEnabled || !currentProjectId) return;

      console.log('[useThumbnail] Page unloading, generating thumbnail immediately');

      // Cancel any pending debounced generation
      cancelScheduledSnapshot();

      // Generate thumbnail immediately (synchronous as much as possible)
      if (stageRef.current && !isGeneratingRef.current) {
        // Use sendBeacon for reliable upload during page unload
        generateThumbnailNow().catch(error => {
          console.error('[useThumbnail] Failed to generate thumbnail on unload:', error);
        });
      }
    };

    const handleVisibilityChange = () => {
      const currentEnabled = enabledRef.current;
      const currentProjectId = projectIdRef.current;

      if (!currentEnabled || !currentProjectId) return;

      if (document.visibilityState === 'hidden') {
        console.log('[useThumbnail] Page hidden, generating thumbnail');
        generateThumbnailNow().catch(error => {
          console.error('[useThumbnail] Failed to generate thumbnail on visibility change:', error);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stageRef, cancelScheduledSnapshot, generateThumbnailNow]); // Stable dependencies only

  // Set up navigation event listeners (for SPA navigation)
  useEffect(() => {
    const handleRouteChange = () => {
      const currentEnabled = enabledRef.current;
      const currentProjectId = projectIdRef.current;

      if (!currentEnabled || !currentProjectId) return;

      console.log('[useThumbnail] Route changing, generating thumbnail');
      generateThumbnailNow().catch(error => {
        console.error('[useThumbnail] Failed to generate thumbnail on route change:', error);
      });
    };

    // Listen for Next.js router events if available
    if (typeof window !== 'undefined' && window.history) {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = function(...args) {
        handleRouteChange();
        return originalPushState.apply(this, args);
      };

      window.history.replaceState = function(...args) {
        handleRouteChange();
        return originalReplaceState.apply(this, args);
      };

      window.addEventListener('popstate', handleRouteChange);

      return () => {
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
        window.removeEventListener('popstate', handleRouteChange);
      };
    }
  }, [generateThumbnailNow]); // Only depend on stable generateThumbnailNow

  return {
    scheduleSnapshot,
    generateThumbnailNow,
    cancelScheduledSnapshot,
    isGenerating: isGeneratingRef.current,
  };
}
