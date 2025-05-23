'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { getAdGenerationStreamUrl } from '@/lib/generate-ad';
import { useSSEEventHandler } from './event-handler';

// Constants for SSE connection
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 60000; // 60 seconds

/**
 * Hook for handling SSE connections on the Product page
 */
export function useProductPageSSE() {
  // Refs for SSE connection
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const currentJobIdRef = useRef<string | null>(null);

  // Get the event handler from the shared hook
  const { handleSSEEvent } = useSSEEventHandler();

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
        console.warn('[ProductPage SSE] Connection timed out - no messages received');

        // Store the current job ID before disconnecting
        const jobIdToReconnect = currentJobIdRef.current;

        // Clean up the current connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        // Only show timeout message if we've exceeded max reconnect attempts
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          // Add error message
          useChatStore.getState().addMessage({
            role: 'assistant',
            type: 'error',
            content: 'Connection to the server timed out after multiple attempts. Please try again.',
          });
        } else if (jobIdToReconnect) {
          // Attempt to reconnect with backoff
          const delay = calculateBackoffDelay(reconnectAttemptsRef.current);
          console.log(`[ProductPage SSE] Connection timed out. Attempting to reconnect to job ${jobIdToReconnect} in ${Math.round(delay/1000)} seconds (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          // Add error message
          useChatStore.getState().addMessage({
            role: 'assistant',
            type: 'error',
            content: 'Connection timed out. Attempting to reconnect...',
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectToSSE(jobIdToReconnect);
          }, delay);
        }
      }
    }, CONNECTION_TIMEOUT);
  }, [calculateBackoffDelay]);

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
    currentJobIdRef.current = null;
  }, []);

  // Connect to SSE stream
  const connectToSSE = useCallback((jobId: string) => {
    try {
      console.log(`[ProductPage SSE] connectToSSE called with jobId: ${jobId}`);

      // Validate job ID
      if (!jobId) {
        console.error(`[ProductPage SSE] Invalid job ID provided:`, jobId);
        return;
      }

      // Clean up any existing connection first
      if (eventSourceRef.current) {
        console.log(`[ProductPage SSE] Closing existing connection before connecting to job ID: ${jobId}`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Clear any existing timeouts
      if (connectionTimeoutRef.current) {
        console.log(`[ProductPage SSE] Clearing existing connection timeout`);
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        console.log(`[ProductPage SSE] Clearing existing reconnect timeout`);
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      console.log(`[ProductPage SSE] Connecting to stream for job ID: ${jobId} (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      // Add a timestamp parameter to avoid caching issues
      const timestamp = Date.now();
      const baseUrl = getAdGenerationStreamUrl(jobId);

      if (!baseUrl) {
        console.error(`[ProductPage SSE] Invalid stream URL generated for job ID: ${jobId}`);
        return;
      }

      const urlWithTimestamp = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${timestamp}`;

      console.log(`[ProductPage SSE] Creating EventSource with URL: ${urlWithTimestamp}`);
      const eventSource = new EventSource(urlWithTimestamp);
      eventSourceRef.current = eventSource;
      currentJobIdRef.current = jobId;

      // Set connection states
      eventSource.onopen = () => {
        console.log(`[ProductPage SSE] Connection established for job ID: ${jobId}`);
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0;
      };

      // Handle errors with improved reconnection logic
      eventSource.onerror = (error) => {
        try {
          const readyState = eventSource.readyState;
          console.error(`[ProductPage SSE] Connection error (readyState: ${readyState}):`, error);

          // Store the current job ID before disconnecting
          const jobIdToReconnect = currentJobIdRef.current;

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
            console.error(`[ProductPage SSE] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);

            // Add error message
            useChatStore.getState().addMessage({
              role: 'assistant',
              type: 'error',
              content: isConnectionError
                ? "Unable to establish connection to the server. This might be due to network issues or the server being unavailable."
                : `Connection to the server was lost after multiple attempts. (readyState: ${readyState})`,
            });

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

            console.log(`[ProductPage SSE] Will attempt to reconnect to job ${jobIdToReconnect} in ${Math.round(delay/1000)} seconds (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

            // Only show error message on first reconnect attempt
            if (reconnectAttemptsRef.current === 1) {
              useChatStore.getState().addMessage({
                role: 'assistant',
                type: 'error',
                content: isConnectionError
                  ? "Unable to establish connection to the server. Attempting to reconnect..."
                  : `Connection to the server was lost. Attempting to reconnect... (readyState: ${readyState})`,
              });
            }

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`[ProductPage SSE] Attempting to reconnect to job ${jobIdToReconnect}...`);
              connectToSSE(jobIdToReconnect);
            }, delay);
          }
        } catch (err) {
          console.error('[ProductPage SSE] Error in error handler:', err);
          // Safely disconnect and reset state
          disconnectSSE();

          // Add error message
          useChatStore.getState().addMessage({
            role: 'assistant',
            type: 'error',
            content: "An unexpected error occurred with the connection. Please try again.",
          });
        }
      };

      // Generic message handler for events without a specific type
      eventSource.onmessage = (event) => {
        try {
          console.log(`[ProductPage SSE] Received generic message:`, event.data);

          // Check if event.data is defined and not empty
          if (!event.data) {
            console.warn('[ProductPage SSE] Received empty event data');
            return;
          }

          const eventData = JSON.parse(event.data);
          handleSSEEvent(eventData);

          // Reset the timeout on any message
          setConnectionTimeout();
        } catch (error) {
          console.error('[ProductPage SSE] Error parsing SSE event:', error);
          // Don't disconnect on parse errors, just log them
        }
      };

      // Define the stages to listen for
      const stages = [
        'plan',
        'page_scrape_started',
        'page_scrape_done',
        'image_extraction_started',
        'image_extraction_done',
        'research_started',
        'research_done',
        'concepts_started',
        'concepts_done',
        'ideas_started',
        'ideas_done',
        'images_started',
        'image_generation_progress',
        'images_done',
        'done',
        'error',
        'heartbeat'
      ];

      // Add event listeners for each stage
      stages.forEach(stage => {
        eventSource.addEventListener(stage, (event) => {
          try {
            console.log(`[ProductPage SSE] Received ${stage} event:`, event.data);

            // Check if event.data is defined and not empty
            if (!event.data) {
              console.warn(`[ProductPage SSE] Received empty ${stage} event data`);
              return;
            }

            const eventData = JSON.parse(event.data);
            handleSSEEvent(eventData);

            // Reset the timeout on any event
            setConnectionTimeout();

            // Close the connection on done or error
            if (stage === 'done' || stage === 'error') {
              console.log(`[ProductPage SSE] Closing connection due to ${stage} event`);
              disconnectSSE();
            }
          } catch (error) {
            console.error(`[ProductPage SSE] Error parsing ${stage} event:`, error);
            // Don't disconnect on parse errors, just log them
          }
        });
      });

      // Set initial connection timeout
      setConnectionTimeout();

    } catch (error) {
      console.error('[ProductPage SSE] Error creating EventSource:', error);

      // Handle connection creation error
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        useChatStore.getState().addMessage({
          role: 'assistant',
          type: 'error',
          content: 'Failed to establish connection to the server after multiple attempts.',
        });
        disconnectSSE();
      } else if (jobId) {
        // Attempt to reconnect with exponential backoff
        reconnectAttemptsRef.current += 1;
        const delay = calculateBackoffDelay(reconnectAttemptsRef.current - 1);

        console.log(`[ProductPage SSE] Error creating connection. Will attempt to reconnect to job ${jobId} in ${Math.round(delay/1000)} seconds (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectToSSE(jobId);
        }, delay);
      }
    }
  }, [calculateBackoffDelay, disconnectSSE, handleSSEEvent, setConnectionTimeout]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectSSE();
    };
  }, [disconnectSSE]);

  // Return the current job ID as a getter to ensure it's always up-to-date
  return {
    connectToSSE,
    disconnectSSE,
    get currentJobId() { return currentJobIdRef.current; }
  };
}
