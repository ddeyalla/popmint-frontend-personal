/**
 * A service for interacting with the ad generation API endpoints
 */

export interface GenerateAdRequest {
  product_url: string;
  n_images?: number;
}

export interface GenerateAdResponse {
  job_id: string;
}

export interface CancelJobResponse {
  status: string;
}

export interface ApiError {
  error: string;
  errorCode?: string;
  details?: string;
}

/**
 * Service for interacting with ad generation API endpoints
 */
export const adGenerationService = {
  /**
   * Start a new ad generation job
   * 
   * @param params - The parameters for the ad generation
   * @returns A promise that resolves to the job ID
   * @throws An error if the request fails
   */
  async startGeneration(params: GenerateAdRequest): Promise<GenerateAdResponse> {
    try {
      const response = await fetch('/api/proxy/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || `Failed to start generation: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Failed to start ad generation:', error);
      throw error;
    }
  },
  
  /**
   * Get the streaming URL for a job
   * 
   * @param jobId - The ID of the job to stream
   * @returns The URL to connect to for SSE updates
   */
  getStreamUrl(jobId: string): string {
    return `/api/proxy/generate/stream?job_id=${jobId}`;
  },
  
  /**
   * Cancel an ongoing ad generation job
   * 
   * @param jobId - The ID of the job to cancel
   * @returns A promise that resolves when the job has been cancelled
   * @throws An error if the request fails
   */
  async cancelJob(jobId: string): Promise<CancelJobResponse> {
    try {
      const response = await fetch(`/api/proxy/cancel/${jobId}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || `Failed to cancel job: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      throw error;
    }
  },
  
  /**
   * Perform a health check on the ad generation service
   * 
   * @returns A promise that resolves to true if the service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/proxy/healthz');
      if (!response.ok) {
        return false;
      }
      
      const text = await response.text();
      return text === 'pong';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  },
}; 