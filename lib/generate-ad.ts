/**
 * Helper functions for the ad generation API
 */

/**
 * Generates ads from a product URL by initiating a job with the API
 *
 * @param jobId The client-side job ID for tracking (not used by backend)
 * @param productUrl URL of the product to generate ads for
 * @param imageCount Number of ad images to generate (default: 4)
 * @returns The job ID string returned by the server
 */
export async function generateAdsFromProductUrl(jobId: string, productUrl: string, imageCount: number = 4): Promise<string> {
  console.log(`[generate-ad] Starting ad generation for ${productUrl}, count: ${imageCount}, client jobId: ${jobId}`);

  try {
    // Make the request to initiate ad generation
    console.log(`[generate-ad] Making API request to /api/proxy/generate`);
    console.log(`[generate-ad] Request payload:`, {
      job_id: jobId,
      product_url: productUrl,
      n_images: imageCount
    });

    const response = await fetch('/api/proxy/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId, // This is passed through but not used by backend
        product_url: productUrl,
        n_images: imageCount
      }),
    });

    console.log(`[generate-ad] API response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate-ad] API error response:`, errorText);
      throw new Error(`Failed to start ad generation: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[generate-ad] API response data:`, data);

    if (!data.job_id) {
      console.error(`[generate-ad] No job_id in response:`, data);
      throw new Error('No job ID returned from the server');
    }

    // Use the server-generated job ID for SSE connection
    const serverJobId = data.job_id;
    console.log(`[generate-ad] Job started with server ID: ${serverJobId} (client ID: ${jobId})`);
    return serverJobId;
  } catch (error: any) {
    console.error('[generate-ad] Error starting ad generation:', error);
    throw new Error(`Failed to start ad generation: ${error.message}`);
  }
}

/**
 * Gets the URL for the server-sent events stream for a job
 *
 * @param jobId The job ID to stream
 * @returns The URL to connect to for SSE events or empty string if jobId is invalid
 */
export function getAdGenerationStreamUrl(jobId: string): string {
  if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
    console.error('[generate-ad] Invalid job ID provided to getAdGenerationStreamUrl:', jobId);
    return '';
  }

  try {
    // Ensure the job ID is properly encoded for URL parameters
    const encodedJobId = encodeURIComponent(jobId.trim());
    return `/api/proxy/generate/stream?job_id=${encodedJobId}`;
  } catch (error) {
    console.error('[generate-ad] Error encoding job ID for stream URL:', error);
    return '';
  }
}

/**
 * Cancels an in-progress ad generation job
 *
 * @param jobId The job ID to cancel
 * @returns True if the cancellation was successful
 */
export async function cancelAdGeneration(jobId: string): Promise<boolean> {
  console.log(`[generate-ad] Cancelling ad generation job: ${jobId}`);

  try {
    const response = await fetch(`/api/proxy/cancel/${jobId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to cancel job: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.success === false) {
      throw new Error(data.message || 'Failed to cancel job');
    }

    console.log(`[generate-ad] Successfully cancelled job: ${jobId}`);
    return true;
  } catch (error: any) {
    console.error(`[generate-ad] Error cancelling job ${jobId}:`, error);
    throw new Error(`Failed to cancel job: ${error.message}`);
  }
}

/**
 * Check if the ad generation service is healthy
 *
 * @returns A Promise that resolves to true if the service is healthy
 */
export async function checkAdGenerationHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/proxy/healthz');
    if (!response.ok) {
      return false;
    }

    const text = await response.text();
    return text === 'pong';
  } catch (error) {
    console.error('Ad generation health check failed:', error);
    return false;
  }
}

/**
 * Extracts a product URL from text content
 *
 * @param content The text to analyze
 * @returns The extracted URL or null if none found
 */
export function extractProductUrl(content: string): string | null {
  // Try to extract any URL from the content
  const urlMatch = content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
  if (urlMatch && urlMatch.length > 0) {
    return urlMatch[0];
  }

  return null;
}

/**
 * Types for the ad generation API
 */

export type AdGenerationErrorCode =
  | 'SCRAPE_FAIL'
  | 'IMAGE_EXTRACTION_FAIL'
  | 'RESEARCH_FAIL'
  | 'CONCEPT_FAIL'
  | 'IDEA_FAIL'
  | 'IMAGE_GENERATION_FAIL'
  | 'CANCELLED'
  | 'UNKNOWN_ERROR'
  | 'JOB_NOT_FOUND';

export type AdGenerationStage =
  | 'plan'
  | 'page_scrape_started'
  | 'page_scrape_done'
  | 'image_extraction_started'
  | 'image_extraction_done'
  | 'research_started'
  | 'research_done'
  | 'concepts_started'
  | 'concepts_done'
  | 'ideas_started'
  | 'ideas_done'
  | 'images_started'
  | 'image_generation_progress'
  | 'images_done'
  | 'done'
  | 'error';

export interface AdGenerationSSEEvent {
  jobId: string;
  stage: AdGenerationStage;
  pct?: number;
  message?: string;
  data?: any;
  errorCode?: AdGenerationErrorCode;
}