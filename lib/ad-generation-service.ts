// Stub file for ad-generation-service.ts
// This is used by the test ad-generator component

export interface GenerateAdRequest {
  product_url: string;
  n_images: number;
}

export const adGenerationService = {
  startGeneration: async (request: GenerateAdRequest): Promise<{ job_id: string }> => {
    return { job_id: 'stub-job-id' };
  },
  
  getStreamUrl: (jobId: string) => {
    return `/api/proxy/stream?job_id=${jobId}`;
  },
  
  cancelJob: async (jobId: string) => {
    // Stub implementation
    return Promise.resolve();
  }
}; 