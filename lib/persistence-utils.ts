// Utility functions for handling persistence operations with retry logic

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

export interface PersistenceError extends Error {
  isRetryable: boolean;
  statusCode?: number;
}

// Default retry configuration
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
};

/**
 * Retry wrapper for async operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (error instanceof Error && 'isRetryable' in error && !error.isRetryable) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = config.exponentialBackoff
        ? config.retryDelay * Math.pow(2, attempt)
        : config.retryDelay;

      console.log(`[Persistence] Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Create a retryable error
 */
export function createRetryableError(message: string, statusCode?: number): PersistenceError {
  const error = new Error(message) as PersistenceError;
  error.isRetryable = true;
  error.statusCode = statusCode;
  return error;
}

/**
 * Create a non-retryable error
 */
export function createNonRetryableError(message: string, statusCode?: number): PersistenceError {
  const error = new Error(message) as PersistenceError;
  error.isRetryable = false;
  error.statusCode = statusCode;
  return error;
}

/**
 * Check if an HTTP status code indicates a retryable error
 */
export function isRetryableStatusCode(statusCode: number): boolean {
  // Retry on server errors (5xx) and some client errors
  return statusCode >= 500 || statusCode === 408 || statusCode === 429;
}

/**
 * Generic API call wrapper with error handling
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit = {},
  retryOptions?: RetryOptions
): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorMessage = `API call failed: ${response.status} ${response.statusText}`;
      
      if (isRetryableStatusCode(response.status)) {
        throw createRetryableError(errorMessage, response.status);
      } else {
        throw createNonRetryableError(errorMessage, response.status);
      }
    }

    return response.json();
  }, retryOptions);
}

/**
 * Debounce function for batching rapid updates
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Queue for offline operations
 */
export class OfflineQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  add(operation: () => Promise<any>): void {
    this.queue.push(operation);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      try {
        await operation();
      } catch (error) {
        console.error('[OfflineQueue] Operation failed:', error);
        // Re-queue the operation for retry
        this.queue.unshift(operation);
        break;
      }
    }

    this.isProcessing = false;
  }

  clear(): void {
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }
}

// Global offline queue instance
export const offlineQueue = new OfflineQueue();
