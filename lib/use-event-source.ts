import { useState, useEffect, useRef } from 'react';

// Define the interface for the hook's options
export interface UseEventSourceOptions {
  onMessage?: (event: MessageEvent<any>) => void;
  onOpen?: (event: Event) => void;
  onError?: (event: Event) => void;
  onEvent?: (eventName: string, data: any) => void;
  autoConnect?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// Define the interface for the hook's return value
export interface UseEventSourceReturn {
  connect: (url: string) => void;
  disconnect: () => void;
  connected: boolean;
  error: Error | null;
  lastEventId: string | null;
  retryCount: number;
}

/**
 * Custom hook for working with Server-Sent Events (SSE)
 * 
 * @param url - The URL of the SSE endpoint (optional, can be provided later via connect())
 * @param options - Configuration options for the event source
 * @returns Object with methods to control the connection and status information
 */
export function useEventSource(
  url?: string,
  {
    onMessage,
    onOpen,
    onError,
    onEvent,
    autoConnect = true,
    maxRetries = 3,
    retryDelay = 2000,
  }: UseEventSourceOptions = {}
): UseEventSourceReturn {
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const initialUrlRef = useRef<string | undefined>(url);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef<boolean>(true);
  
  // Function to establish connection
  const connect = (newUrl?: string) => {
    // Don't connect if component is unmounted
    if (!mounted.current) return;
    
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Clear any previous retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Clear any previous errors
    setError(null);
    
    // Use the new URL if provided, otherwise use the initial URL
    const targetUrl = newUrl || initialUrlRef.current;
    if (!targetUrl) {
      setError(new Error('URL is required to establish a connection'));
      return;
    }
    
    try {
      // Create new EventSource connection
      const eventSource = new EventSource(targetUrl);
      eventSourceRef.current = eventSource;
      
      // Set up event handlers
      eventSource.onopen = (event) => {
        if (!mounted.current) return;
        console.log('🔍 DEBUG - SSE connection opened:', targetUrl);
        setConnected(true);
        setRetryCount(0); // Reset retry count on successful connection
        if (onOpen) onOpen(event);
      };
      
      eventSource.onerror = (event) => {
        if (!mounted.current) return;
        
        // Extract more detailed error information if available
        const errorDetails = {
          status: (event.target as any)?.status,
          readyState: eventSource.readyState,
          url: targetUrl,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ ERROR - SSE connection error:', errorDetails);
        
        // Handle different error states
        switch (eventSource.readyState) {
          case EventSource.CONNECTING:
            // Still trying to connect, no action needed
            console.log('⏳ INFO - SSE reconnecting to:', targetUrl);
            break;
            
          case EventSource.CLOSED:
            // Connection is closed, try to reconnect if under max retries
            setConnected(false);
            
            // Clean up the event source
            eventSource.close();
            eventSourceRef.current = null;
            
            // Set detailed error
            const errorMsg = `EventSource connection closed: ${JSON.stringify(errorDetails)}`;
            setError(new Error(errorMsg));
            
            // Call error handler if provided
            if (onError) onError(event);
            
            // Emit hook-specific error event for consumers
            if (onEvent) onEvent('hook_connection_error', { 
              type: 'ConnectionClosed', 
              message: 'SSE connection was closed.', 
              details: errorDetails 
            });
            
            // Attempt to reconnect if under max retries
            if (retryCount < maxRetries) {
              console.log(`🔄 INFO - Will retry SSE connection (${retryCount + 1}/${maxRetries}) in ${retryDelay}ms...`);
              
              // Schedule retry after delay
              retryTimeoutRef.current = setTimeout(() => {
                if (!mounted.current) return;
                
                console.log(`🔄 INFO - Retrying SSE connection (${retryCount + 1}/${maxRetries})...`);
                setRetryCount(prev => prev + 1); // Increment before connecting
                connect(targetUrl); // Pass targetUrl to ensure it retries with the correct one
              }, retryDelay);
            } else {
              console.error(`🛑 ERROR - Max retries (${maxRetries}) reached for SSE connection:`, targetUrl);
              if (onEvent) onEvent('hook_connection_error', { 
                type: 'MaxRetriesReached', 
                message: 'Max SSE connection retries reached.',
                details: { maxRetries, retryCount, url: targetUrl }
              });
            }
            break;
            
          default:
            // For other error states
            setConnected(false);
            setError(new Error(`EventSource connection error: ${JSON.stringify(errorDetails)}`));
            
            // Call error handler if provided
            if (onError) onError(event);
            
            // Emit hook-specific error event for consumers
            if (onEvent) onEvent('hook_connection_error', { 
              type: 'GenericConnectionError', 
              message: 'A generic SSE connection error occurred.',
              details: errorDetails 
            });
        }
      };
      
      eventSource.onmessage = (event) => {
        if (!mounted.current) return;
        
        console.log('🔍 DEBUG - SSE message received:', event);
        if (event.lastEventId) {
          setLastEventId(event.lastEventId);
        }
        if (onMessage) onMessage(event);
        
        // Parse and handle the data
        try {
          const parsedData = JSON.parse(event.data);
          // Also emit via the general event handler if provided
          if (onEvent) onEvent('message', parsedData);
        } catch (e) {
          console.warn('⚠️ WARNING - Failed to parse SSE message data:', event.data);
        }
      };
      
      // Set up handling for named events if we have an onEvent handler
      if (onEvent) {
        eventSource.addEventListener('error', (event: any) => {
          if (!mounted.current) return;
          
          try {
            const parsedData = event.data ? JSON.parse(event.data) : { error: 'Unknown error event' };
            onEvent('error', parsedData);
          } catch (e) {
            onEvent('error', { error: 'Error event occurred', originalEvent: event });
          }
        });
        
        // Handle any other custom events the server might send
        [
          // Original events
          'agentProgress', 'agentOutput', 'progress', 'complete', 'cancelled',
          // Stages from backenddoc.md (excluding 'error' which is handled separately)
          'plan',
          'page_scrape_started', 'page_scrape_done',
          'image_extraction_started', 'image_extraction_done',
          'research_started', 'research_done',
          'concepts_started', 'concepts_done',
          'ideas_started', 'ideas_done',
          'images_started', 'image_generation_progress', 'images_done',
          'done',
          // Events that chat-input.tsx listens for, potentially aliased or custom
          // These might be redundant if backend sends standard stages, but included for broader capture initially
          'planning_step_updated',
          'research_completed', // Likely alias for research_done
          'creative_strategy_completed', // Custom or alias?
          'ad_concepts_generated', // Likely alias for concepts_done
          'ad_image_generated', // Likely alias for image_generation_progress
          'pipeline_completed', // Likely alias for done
          'pipeline_failed' // Likely alias for error
        ].forEach(eventName => {
          eventSource.addEventListener(eventName, (event: any) => {
            if (!mounted.current) return;
            
            try {
              const parsedData = JSON.parse(event.data);
              onEvent(eventName, parsedData);
            } catch (e) {
              console.warn(`⚠️ WARNING - Failed to parse SSE ${eventName} data:`, event.data);
              onEvent(eventName, { error: `Failed to parse ${eventName} data`, originalEvent: event });
            }
          });
        });
      }
      
    } catch (err: any) {
      console.error('❌ ERROR - Failed to create EventSource:', err);
      setError(err);
      setConnected(false);
    }
  };
  
  // Function to close the connection
  const disconnect = () => {
    if (eventSourceRef.current) {
      console.log('🔍 DEBUG - Closing SSE connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
    
    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };
  
  // Connect when the component mounts if URL is provided and autoConnect is true
  useEffect(() => {
    mounted.current = true;
    
    if (autoConnect && url) {
      connect(url);
    }
    
    // Clean up the connection when the component unmounts
    return () => {
      mounted.current = false;
      disconnect();
    };
  }, []);
  
  return {
    connect,
    disconnect,
    connected,
    error,
    lastEventId,
    retryCount,
  };
} 