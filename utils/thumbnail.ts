// Canvas thumbnail generation utilities
import Konva from 'konva';

/**
 * Generate a thumbnail from a Konva Stage
 * @param stage - The Konva Stage instance
 * @param options - Configuration options for thumbnail generation
 * @returns Promise<Blob> - The generated thumbnail as a JPEG blob
 */
export async function generateThumbnail(
  stage: Konva.Stage,
  options: {
    pixelRatio?: number;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<Blob> {
  const {
    pixelRatio = 0.5,
    quality = 0.6,
    maxWidth = 512,
    maxHeight = 512,
  } = options;

  try {
    console.log('[Thumbnail] Generating thumbnail with options:', {
      pixelRatio,
      quality,
      maxWidth,
      maxHeight,
    });

    // Generate data URL from stage
    const dataURL = stage.toDataURL({
      pixelRatio,
      mimeType: 'image/jpeg',
      quality,
      width: maxWidth,
      height: maxHeight,
    });

    console.log('[Thumbnail] Generated data URL, converting to blob...');

    // Convert data URL to blob
    const response = await fetch(dataURL);
    const blob = await response.blob();

    console.log('[Thumbnail] Generated blob:', {
      size: blob.size,
      type: blob.type,
      sizeKB: Math.round(blob.size / 1024),
    });

    // Validate blob size (should be under 100KB as per requirements)
    if (blob.size > 100 * 1024) {
      console.warn('[Thumbnail] Generated blob is larger than 100KB:', blob.size);
    }

    return blob;
  } catch (error) {
    console.error('[Thumbnail] Error generating thumbnail:', error);
    throw new Error('Failed to generate thumbnail');
  }
}

/**
 * Upload thumbnail to the server
 * @param projectId - The project ID
 * @param blob - The thumbnail blob
 * @returns Promise<string> - The thumbnail URL
 */
export async function uploadThumbnail(
  projectId: string,
  blob: Blob
): Promise<string> {
  try {
    console.log('[Thumbnail] Uploading thumbnail for project:', projectId);

    const response = await fetch(`/api/projects/${projectId}/thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[Thumbnail] Upload successful:', result);

    return result.thumbnail_url;
  } catch (error) {
    console.error('[Thumbnail] Error uploading thumbnail:', error);
    throw error;
  }
}

/**
 * Generate and upload thumbnail in one operation
 * @param stage - The Konva Stage instance
 * @param projectId - The project ID
 * @param options - Configuration options for thumbnail generation
 * @returns Promise<string> - The thumbnail URL
 */
export async function generateAndUploadThumbnail(
  stage: Konva.Stage,
  projectId: string,
  options?: Parameters<typeof generateThumbnail>[1]
): Promise<string> {
  try {
    console.log('[Thumbnail] Starting generate and upload for project:', projectId);

    const blob = await generateThumbnail(stage, options);
    const thumbnailUrl = await uploadThumbnail(projectId, blob);

    console.log('[Thumbnail] Successfully generated and uploaded thumbnail:', thumbnailUrl);
    return thumbnailUrl;
  } catch (error) {
    console.error('[Thumbnail] Error in generate and upload:', error);
    throw error;
  }
}

/**
 * Retry wrapper for thumbnail operations
 * @param operation - The operation to retry
 * @param maxRetries - Maximum number of retries
 * @param delay - Delay between retries in milliseconds
 * @returns Promise<T> - The result of the operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Thumbnail] Attempt ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Thumbnail] Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        console.log(`[Thumbnail] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError!;
}

/**
 * Debounced thumbnail generation
 * Creates a debounced version of thumbnail generation to avoid excessive calls
 */
export function createDebouncedThumbnailGenerator(
  delay: number = 2000
): (stage: Konva.Stage, projectId: string) => Promise<void> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingOperation: Promise<void> | null = null;

  return async (stage: Konva.Stage, projectId: string): Promise<void> => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // If there's already a pending operation, wait for it to complete
    if (pendingOperation) {
      await pendingOperation;
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          console.log('[Thumbnail] Executing debounced thumbnail generation');
          pendingOperation = withRetry(
            () => generateAndUploadThumbnail(stage, projectId),
            3
          ).then(() => {
            pendingOperation = null;
          });

          await pendingOperation;
          resolve();
        } catch (error) {
          console.error('[Thumbnail] Debounced generation failed:', error);
          pendingOperation = null;
          reject(error);
        }
      }, delay);
    });
  };
}
