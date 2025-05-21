import { adGenerationService, GenerateAdRequest } from '@/lib/ad-generation-service';

/**
 * Helper functions for the ad generation API
 */

/**
 * Generates ads from a product URL by initiating a job with the API
 * 
 * @param productUrl URL of the product to generate ads for
 * @param imageCount Number of ad images to generate (default: 4)
 * @returns The job ID string for the ad generation job
 */
export async function generateAdsFromProductUrl(productUrl: string, imageCount: number = 4): Promise<string> {
  console.log(`[generate-ad] Starting ad generation for ${productUrl}, count: ${imageCount}`);
  
  try {
    // Make the request to initiate ad generation
    const response = await fetch('/api/proxy/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_url: productUrl,
        num_images: imageCount
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to start ad generation: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.job_id) {
      throw new Error('No job ID returned from the server');
    }
    
    console.log(`[generate-ad] Job started with ID: ${data.job_id}`);
    return data.job_id;
  } catch (error: any) {
    console.error('[generate-ad] Error starting ad generation:', error);
    throw new Error(`Failed to start ad generation: ${error.message}`);
  }
}

/**
 * Gets the URL for the server-sent events stream for a job
 * 
 * @param jobId The job ID to stream
 * @returns The URL to connect to for SSE events
 */
export function getAdGenerationStreamUrl(jobId: string): string {
  return `/api/proxy/generate/stream?job_id=${jobId}`;
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

/**
 * Check if the ad generation service is healthy
 * 
 * @returns A Promise that resolves to true if the service is healthy
 */
export async function checkAdGenerationHealth(): Promise<boolean> {
  try {
    return await adGenerationService.checkHealth();
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
  // First check if content contains a command pattern
  if (content.toLowerCase().startsWith('/ad')) {
    const commandText = content.replace(/^\/ad\s+/i, '').trim();
    
    // Check for flags like --count=4
    const countMatch = commandText.match(/(--count=|--n=|-n=)(\d+)$/);
    
    if (countMatch) {
      // Extract URL without the count flag
      return commandText.replace(countMatch[0], '').trim();
    }
    
    // Return the whole text after the command
    return commandText;
  }
  
  // Otherwise try to extract any URL
  const urlMatch = content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
  if (urlMatch && urlMatch.length > 0) {
    return urlMatch[0];
  }
  
  return null;
} 