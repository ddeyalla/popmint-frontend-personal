import { useCallback, useRef, RefObject } from "react";
import { getAdGenerationStreamUrl } from "@/lib/generate-ad";

// Constants for SSE connection
export const MAX_RECONNECT_ATTEMPTS = 5;
export const INITIAL_RECONNECT_DELAY = 1000; // 1 second
export const MAX_RECONNECT_DELAY = 30000; // 30 seconds
export const CONNECTION_TIMEOUT = 60000; // 60 seconds

export interface SSEConnectionOptions {
  onEvent: (eventData: any) => void;
  onDisconnect: () => void;
  onError: (jobId: string | null, message: string, errorCode?: string) => void;
  onTimeout: (jobId: string | null, reconnectAttempts: number, maxAttempts: number) => void;
}

export interface SSEConnectionHook {
  connectToSSE: (jobId: string) => void;
  disconnectSSE: () => void;
  calculateBackoffDelay: (attempt: number, initialDelay?: number) => number;
  setConnectionTimeout: () => void;
  eventSourceRef: RefObject<EventSource | null>;
  connectionTimeoutRef: RefObject<NodeJS.Timeout | null>;
  reconnectTimeoutRef: RefObject<NodeJS.Timeout | null>;
  reconnectAttemptsRef: RefObject<number>;
}

/**
 * Hook for managing SSE connections with automatic reconnection
 */
export function useSSEConnection(
  currentJobId: string | null,
  setCurrentJobId: (jobId: string | null) => void,
  options: SSEConnectionOptions
): SSEConnectionHook {
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // Helper function to calculate exponential backoff delay
  const calculateBackoffDelay = useCallback((attempt: number, initialDelay: number = INITIAL_RECONNECT_DELAY): number => {
    // Calculate delay with exponential backoff: 2^attempt * initial delay
    const delay = Math.min(
      initialDelay * Math.pow(2, attempt),
      MAX_RECONNECT_DELAY
    );
    // Add some jitter to prevent all clients from reconnecting simultaneously
    return delay + (Math.random() * 1000);
  }, []);

  // Helper function to set connection timeout
  const setConnectionTimeout = useCallback(() => {
    // Clear any existing timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    // Set a new timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (eventSourceRef.current) {
        console.warn('[SSE] Connection timed out - no messages received');

        // Store the current job ID before disconnecting
        const jobIdToReconnect = currentJobId;

        // Clean up the current connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Only show timeout message if we've exceeded max reconnect attempts
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          // Call timeout handler with max attempts reached
          options.onTimeout(currentJobId, reconnectAttemptsRef.current, MAX_RECONNECT_ATTEMPTS);
        } else if (jobIdToReconnect) {
          // Attempt to reconnect with backoff
          const delay = calculateBackoffDelay(reconnectAttemptsRef.current);
          console.log(`[SSE] Connection timed out. Attempting to reconnect to job ${jobIdToReconnect} in ${Math.round(delay/1000)} seconds (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          // Call timeout handler with current attempt
          options.onTimeout(jobIdToReconnect, reconnectAttemptsRef.current, MAX_RECONNECT_ATTEMPTS);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectToSSE(jobIdToReconnect);
          }, delay);
        }
      }
    }, CONNECTION_TIMEOUT);
  }, [currentJobId, calculateBackoffDelay, options]);

  // Disconnect SSE
  const disconnectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // Reset reconnect attempts when we intentionally disconnect
    reconnectAttemptsRef.current = 0;
    setCurrentJobId(null);

    // Call the onDisconnect callback
    options.onDisconnect();
  }, [options, setCurrentJobId]);

  // Connect to SSE stream
  const connectToSSE = useCallback((jobId: string) => {
    // Clean up any existing connection first
    if (eventSourceRef.current) {
      console.log(`[SSE] Closing existing connection before connecting to job ID: ${jobId}`);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear any existing timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    console.log(`[SSE] Connecting to stream for job ID: ${jobId} (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

    try {
      // Add a timestamp parameter to avoid caching issues
      // This can help with ERR_INCOMPLETE_CHUNKED_ENCODING errors
      const timestamp = Date.now();
      const baseUrl = getAdGenerationStreamUrl(jobId);
      const urlWithTimestamp = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${timestamp}`;

      console.log(`[SSE] Creating EventSource with URL: ${urlWithTimestamp}`);
      const eventSource = new EventSource(urlWithTimestamp);
      eventSourceRef.current = eventSource;
      setCurrentJobId(jobId);

      // Set connection states
      eventSource.onopen = () => {
        console.log(`[SSE] Connection established for job ID: ${jobId}`);
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
      };

      // Generic message handler for events without a specific type
      eventSource.onmessage = (event) => {
        try {
          console.log(`[SSE] Received generic message:`, event.data);

          // Check if event.data is defined and not empty
          if (!event.data) {
            console.warn('[SSE] Received empty event data');
            return;
          }

          const eventData = JSON.parse(event.data);
          options.onEvent(eventData);

          // Reset the timeout on any message
          setConnectionTimeout();
        } catch (error) {
          console.error('[SSE] Error parsing SSE event:', error);
          // Don't disconnect on parse errors, just log them
        }
      };

      // Add specific event listeners for each stage
      const stages = [
        'plan',
        'page_scrape_started', 'page_scrape_done',
        'image_extraction_started', 'image_extraction_done',
        'research_started', 'research_done',
        'concepts_started', 'concepts_done',
        'ideas_started', 'ideas_done',
        'images_started', 'image_generation_progress', 'images_done',
        'done', 'error'
      ];

      stages.forEach(stage => {
        eventSource.addEventListener(stage, (event) => {
          try {
            console.log(`[SSE] Received ${stage} event:`, event.data);

            // Check if event.data is defined and not empty
            if (!event.data) {
              console.warn(`[SSE] Received empty ${stage} event data`);
              return;
            }

            const eventData = JSON.parse(event.data);
            options.onEvent(eventData);

            // Reset the timeout on any event
            setConnectionTimeout();

            // Close the connection on done or error
            if (stage === 'done' || stage === 'error') {
              console.log(`[SSE] Closing connection due to ${stage} event`);
              disconnectSSE();
            }
          } catch (error) {
            console.error(`[SSE] Error parsing ${stage} event:`, error);
            // Don't disconnect on parse errors, just log them
          }
        });
      });

      // Add heartbeat event listener
      eventSource.addEventListener('heartbeat', (event) => {
        console.log('[SSE] Heartbeat received:', event.data);
        // Reset the timeout on heartbeat
        setConnectionTimeout();
      });

      // Error handler with improved reconnection logic
      eventSource.onerror = (error) => {
        const readyState = eventSource.readyState;
        console.error(`[SSE] Connection error (readyState: ${readyState}):`, error);

        // Store the current job ID before disconnecting
        const jobIdToReconnect = currentJobId;

        // Close the current connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        // Special handling for readyState 0 (CONNECTING) errors
        // This indicates the connection was never established
        const isConnectionError = readyState === 0;

        // Handle based on readyState and reconnect attempts
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          // We've exceeded max reconnect attempts, give up
          console.error(`[SSE] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);

          // Call the error handler
          options.onError(
            currentJobId,
            isConnectionError
              ? "Unable to establish connection to the server. This might be due to network issues or the server being unavailable."
              : `Connection to the server was lost after multiple attempts. (readyState: ${readyState})`,
            isConnectionError ? "CONNECTION_FAILED" : "CONNECTION_LOST"
          );

          // Full disconnect and reset
          disconnectSSE();
        } else if (jobIdToReconnect) {
          // Attempt to reconnect with exponential backoff
          reconnectAttemptsRef.current += 1;

          // Use a shorter initial delay for connection errors (readyState 0)
          // as these might be temporary network glitches
          const baseDelay = isConnectionError ?
            Math.min(INITIAL_RECONNECT_DELAY, 500) : // 500ms for connection errors
            INITIAL_RECONNECT_DELAY;

          const delay = calculateBackoffDelay(reconnectAttemptsRef.current - 1, baseDelay);

          console.log(`[SSE] Will attempt to reconnect to job ${jobIdToReconnect} in ${Math.round(delay/1000)} seconds (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

          // Only show error message on first reconnect attempt
          if (reconnectAttemptsRef.current === 1) {
            options.onError(
              jobIdToReconnect,
              isConnectionError
                ? "Unable to establish connection to the server. Attempting to reconnect..."
                : `Connection to the server was lost. Attempting to reconnect... (readyState: ${readyState})`,
              isConnectionError ? "CONNECTION_ATTEMPT_FAILED" : "CONNECTION_LOST_RECONNECTING"
            );
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[SSE] Attempting to reconnect to job ${jobIdToReconnect}...`);
            connectToSSE(jobIdToReconnect);
          }, delay);
        }
      };

      // Initial timeout
      setConnectionTimeout();

    } catch (error) {
      console.error('[SSE] Error creating EventSource:', error);

      // Handle connection creation error
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        options.onError(
          jobId,
          'Failed to establish connection to the server after multiple attempts.',
          "CONNECTION_CREATION_FAILED"
        );
        disconnectSSE();
      } else if (jobId) {
        // Attempt to reconnect with exponential backoff
        reconnectAttemptsRef.current += 1;
        const delay = calculateBackoffDelay(reconnectAttemptsRef.current - 1);

        console.log(`[SSE] Error creating connection. Will attempt to reconnect to job ${jobId} in ${Math.round(delay/1000)} seconds (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectToSSE(jobId);
        }, delay);
      }
    }
  }, [options, currentJobId, setCurrentJobId, disconnectSSE, setConnectionTimeout, calculateBackoffDelay]);

  return {
    connectToSSE,
    disconnectSSE,
    calculateBackoffDelay,
    setConnectionTimeout,
    eventSourceRef,
    connectionTimeoutRef,
    reconnectTimeoutRef,
    reconnectAttemptsRef
  };
}
