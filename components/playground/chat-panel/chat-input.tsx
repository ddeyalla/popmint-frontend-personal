import React, { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { XCircle } from "lucide-react"; 
import { useChatStore, AdGenerationStage } from "@/store/chatStore"; 
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import { generateAdsFromProductUrl, getAdGenerationStreamUrl, cancelAdGeneration } from "@/lib/generate-ad";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  disabled?: boolean;
}

const ChatInput = ({ disabled: propDisabled = false }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const {
    addMessage,
    startAdGeneration,
    updateAdGeneration,
    completeAdGenerationStep,
    addGeneratedImage,
    setAdGenerationError,
    completeAdGeneration,
  } = useChatStore();

  const eventSourceRef = useRef<EventSource | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  // Map backend SSE stages to our AdGenerationStage following Frontend-flow.md
  const mapBackendStage = (backendStage: string): AdGenerationStage => {
    switch (backendStage) {
      case 'plan':
        return 'planning';
      case 'page_scrape_started':
      case 'page_scrape_done':
        return 'scraping';
      case 'image_extraction_started':
      case 'image_extraction_done':
        // No UI updates for image extraction per Frontend-flow.md
        return 'scraping';
      case 'research_started':
      case 'research_done':
        return 'researching';
      case 'concepts_started':
      case 'concepts_done':
        return 'concepting';
      case 'ideas_started':
      case 'ideas_done':
        return 'ideating';
      case 'images_started':
      case 'image_generation_progress':
      case 'images_done':
        return 'imaging';
      case 'done':
        return 'completed';
      case 'error':
        return 'error';
      default:
        return 'thinking';
    }
  };

  // Handle SSE events following Frontend-flow.md progression
  const handleSSEEvent = useCallback((eventData: any) => {
    try {
      const { jobId, stage, message, data, pct = 0, errorCode } = eventData || {};
      
      if (!jobId) {
        console.warn('🔥 SSE Event missing jobId:', eventData);
        return;
      }
      
      if (!stage) {
        console.warn('🔥 SSE Event missing stage:', eventData);
        return;
      }
      
      // TypeScript type guard - jobId is guaranteed to be string after the null check above
      const eventJobId = jobId as string;
      const mappedStage = mapBackendStage(stage);

      console.log('🔥 SSE Event:', { jobId: eventJobId, stage, mappedStage, message, pct, data });

      switch (stage) {
        case 'error':
          completeAdGenerationStep(
            eventJobId, 
            'error', 
            `❌ Error: ${message || 'Unknown error occurred'}`,
            { errorCode: errorCode }
          );
          setAdGenerationError(eventJobId, message || 'Unknown error occurred');
          setIsProcessing(false);
          disconnectSSE();
          break;

        case 'done':
          completeAdGenerationStep(
            eventJobId, 
            'completed', 
            `🎉 All ads generated successfully!`,
            { finalImages: data?.imageUrls || [] }
          );
          completeAdGeneration(eventJobId, data?.imageUrls || []);
          setIsProcessing(false);
          disconnectSSE();
          break;

        case 'plan':
          updateAdGeneration(eventJobId, 'planning', {
            progress: pct,
            message: message || 'Smart plan created',
          });
          break;

        case 'page_scrape_started':
          updateAdGeneration(eventJobId, 'scraping', {
            progress: pct,
            message: 'Checking product details...',
          });
          break;

        case 'page_scrape_done':
          completeAdGenerationStep(
            eventJobId, 
            'scraping', 
            `✅ Product details extracted`,
            data?.scraped_content_summary
          );
          break;

        case 'research_started':
          updateAdGeneration(eventJobId, 'researching', {
            progress: pct,
            message: 'Researching...',
          });
          break;

        case 'research_done':
          completeAdGenerationStep(
            eventJobId, 
            'researching', 
            `✅ Research completed`,
            { researchSummary: data?.summary }
          );
          break;

        case 'concepts_started':
          updateAdGeneration(eventJobId, 'concepting', {
            progress: pct,
            message: 'Generating ad concepts...',
          });
          break;

        case 'concepts_done':
          completeAdGenerationStep(
            eventJobId, 
            'concepting', 
            `✅ Ad concepts generated`,
            data?.concepts
          );
          break;

        case 'ideas_started':
          updateAdGeneration(eventJobId, 'ideating', {
            progress: pct,
            message: 'Generating ad copy ideas...',
          });
          break;

        case 'ideas_done':
          completeAdGenerationStep(
            eventJobId, 
            'ideating', 
            `✅ Ad ideas generated`,
            { adIdeas: data?.ideas }
          );
          break;

        case 'images_started':
          updateAdGeneration(eventJobId, 'imaging', {
            progress: pct,
            message: message || 'Generating ads...',
          });
          break;

        case 'image_generation_progress':
          if (data?.image_url) {
            addGeneratedImage(eventJobId, data.image_url);
          }
          updateAdGeneration(eventJobId, 'imaging', {
            progress: pct,
            message: data?.current_image && data?.total_images 
              ? `Generating ad image ${data.current_image} of ${data.total_images}...`
              : 'Generating ads...',
          });
          break;

        case 'images_done':
          completeAdGenerationStep(
            eventJobId, 
            'imaging', 
            `✅ Ads generated`,
            { generatedImages: data?.generated_image_urls }
          );
          break;

        // Skip image extraction started (no UI updates per Frontend-flow.md)
        case 'image_extraction_started':
          // No UI updates for this stage
          break;
          
        case 'image_extraction_done':
          completeAdGenerationStep(
            eventJobId, 
            'scraping', 
            `✅ Product images extracted`,
            { extractedImages: data?.extracted_image_urls }
          );
          break;

        // Heartbeat events - no UI updates needed
        case 'heartbeat':
          console.log('💓 Heartbeat received');
          break;

        default:
          updateAdGeneration(eventJobId, mappedStage, {
            progress: pct,
            message: message || `Processing ${stage}...`,
          });
          break;
      }
    } catch (error) {
      console.error('🔥 Error handling SSE event:', error, 'Event data:', eventData);
      // Don't break the connection for individual event errors
    }
  }, [updateAdGeneration, completeAdGenerationStep, addGeneratedImage, setAdGenerationError, completeAdGeneration, setIsProcessing]);

  // Connect to SSE stream with retry logic
  const connectSSE = useCallback((jobId: string, retryCount = 0) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = getAdGenerationStreamUrl(jobId);
    console.log('🔥 Connecting to SSE:', streamUrl, retryCount > 0 ? `(retry ${retryCount})` : '');

    let eventSource: EventSource;
    try {
      eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('🔥 Failed to create EventSource:', error);
      if (currentJobId && isProcessing) {
        setAdGenerationError(currentJobId, 'Failed to connect to generation stream');
      }
      setIsProcessing(false);
      return;
    }

    eventSource.onopen = () => {
      console.log('🔥 SSE Connected');
      
      // Set a timeout to detect hanging connections (30 seconds without any events)
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      connectionTimeoutRef.current = setTimeout(() => {
        console.warn('🔥 SSE Connection timeout - no events received for 30 seconds');
        if (isProcessing) {
          eventSource.close();
          // Try to reconnect if we haven't exceeded retry limit
          if (retryCount < 3) {
            console.log('🔥 Attempting to reconnect due to timeout');
            connectSSE(jobId, retryCount + 1);
          } else {
            setAdGenerationError(jobId, 'Connection timeout. Please try again.');
            setIsProcessing(false);
            disconnectSSE();
          }
        }
      }, 30000); // 30 second timeout
    };

    eventSource.onmessage = (event) => {
      try {
        // Reset connection timeout on any message
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = setTimeout(() => {
            console.warn('🔥 SSE Connection timeout - no events received for 30 seconds');
            if (isProcessing) {
              eventSource.close();
              if (retryCount < 3) {
                console.log('🔥 Attempting to reconnect due to timeout');
                connectSSE(jobId, retryCount + 1);
              } else {
                setAdGenerationError(jobId, 'Connection timeout. Please try again.');
                setIsProcessing(false);
                disconnectSSE();
              }
            }
          }, 30000);
        }
        
        // Check if event.data exists and is not undefined/null
        if (!event.data || event.data === 'undefined' || event.data === 'null') {
          console.warn('🔥 SSE: Received empty or undefined data');
          return;
        }
        
        const data = JSON.parse(event.data);
        handleSSEEvent(data);
      } catch (error) {
        console.error('🔥 SSE Parse Error:', error, 'Raw data:', event.data);
        // Don't treat parse errors as fatal - continue listening
      }
    };

    eventSource.onerror = (error: Event) => {
      console.error('🔥 SSE Error:', {
        error,
        readyState: eventSource.readyState,
        url: streamUrl,
        jobId: jobId,
        retryCount
      });
      
      // Only handle error if we're still processing
      if (isProcessing) {
        // Try to reconnect on connection errors (up to 3 times)
        if (retryCount < 3 && eventSource.readyState === EventSource.CLOSED) {
          console.log(`🔥 Attempting to reconnect SSE (attempt ${retryCount + 1}/3)`);
          setTimeout(() => {
            if (isProcessing) {
              connectSSE(jobId, retryCount + 1);
            }
          }, Math.pow(2, retryCount) * 1000); // Exponential backoff: 1s, 2s, 4s
          return;
        }
        
        setAdGenerationError(jobId, 'Connection lost. Please try again.');
      }
      setIsProcessing(false);
      disconnectSSE();
    };

    // Handle named events (backend sends events with specific names)
    const eventTypes = [
      'plan', 'page_scrape_started', 'page_scrape_done',
      'image_extraction_started', 'image_extraction_done',
      'research_started', 'research_done',
      'concepts_started', 'concepts_done',
      'ideas_started', 'ideas_done',
      'images_started', 'image_generation_progress', 'images_done',
      'done', 'error', 'heartbeat'
    ];

    eventTypes.forEach(eventType => {
      eventSource.addEventListener(eventType, (event: any) => {
        try {
          // Reset connection timeout on any named event
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = setTimeout(() => {
              console.warn('🔥 SSE Connection timeout - no events received for 30 seconds');
              if (isProcessing) {
                eventSource.close();
                if (retryCount < 3) {
                  console.log('🔥 Attempting to reconnect due to timeout');
                  connectSSE(jobId, retryCount + 1);
                } else {
                  setAdGenerationError(jobId, 'Connection timeout. Please try again.');
                  setIsProcessing(false);
                  disconnectSSE();
                }
              }
            }, 30000);
          }
          
          // Check if event.data exists and is not undefined/null
          if (!event.data || event.data === 'undefined' || event.data === 'null') {
            console.warn(`🔥 SSE ${eventType}: Received empty or undefined data`);
            return;
          }
          
          const data = JSON.parse(event.data);
          handleSSEEvent({ ...data, stage: eventType });
        } catch (error) {
          console.error(`🔥 SSE ${eventType} Parse Error:`, error, 'Raw data:', event.data);
          // Don't treat parse errors as fatal - continue listening
        }
      });
    });
  }, [handleSSEEvent, setAdGenerationError]);

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
    setCurrentJobId(null);
  }, []);

  // Handle form submission
  const handleSubmit = async (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isProcessing) return;

    // Check if message contains a URL for ad generation
    const urlMatch = trimmedValue.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
    
    if (urlMatch && urlMatch.length > 0) {
      // Handle ad generation
      let productUrl = urlMatch[0];
      if (!productUrl.startsWith('http')) {
        productUrl = 'https://' + productUrl;
      }

      setIsProcessing(true);
      
      try {
        // Start the backend job first to get the real job ID
        const backendJobId = await generateAdsFromProductUrl(productUrl);
        console.log('🔥 Backend Job Started:', backendJobId);
        
        if (!backendJobId) {
          throw new Error('No job ID returned from backend');
        }
        
        setCurrentJobId(backendJobId);
        
        // Start ad generation in the store with "thinking" stage
        startAdGeneration(backendJobId, trimmedValue);
        
        // Connect to SSE
        console.log('🔥 Connecting to SSE with job ID:', backendJobId);
        connectSSE(backendJobId);
        
      } catch (error: any) {
        console.error('🔥 Ad Generation Error:', error);
        toast.error(`Failed to start ad generation: ${error.message}`);
        setIsProcessing(false);
        setCurrentJobId(null);
      }
    } else {
      // Handle regular chat messages
      addMessage({
        role: 'user',
        type: 'text',
        content: trimmedValue,
      });
    }

    setInputValue("");
  };

  // Handle cancellation
  const handleCancel = async () => {
    if (!currentJobId) {
      console.warn('🔥 Cancel requested but no current job ID');
      setIsProcessing(false);
      disconnectSSE();
      return;
    }

    try {
      await cancelAdGeneration(currentJobId);
      setAdGenerationError(currentJobId, 'Generation cancelled by user');
      toast.success('Ad generation cancelled');
    } catch (error: any) {
      console.error('🔥 Cancel error:', error);
      toast.error(`Failed to cancel: ${error.message}`);
    } finally {
      setIsProcessing(false);
      disconnectSSE();
    }
  };

  const disabled = propDisabled || isProcessing;

  return (
    <div className="relative w-full px-4 pb-2 pt-2 md:pt-0 lg:pt-0 xl:pt-0">
      {isProcessing && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCancel}
          className="absolute right-4 top-[-36px] z-10 bg-background hover:bg-destructive/10 border-destructive/50 text-destructive shadow-sm"
        >
          <XCircle className="mr-2 h-4 w-4" /> Cancel Generation
        </Button>
      )}
      <AIInputWithSearch
        onChange={setInputValue}
        onSubmit={handleSubmit}
        placeholder="Paste a product URL to generate ads (e.g., https://example.com/product-page) or type a message..."
        disabled={disabled}
        minHeight={52}
        onFileSelect={(file) => {
          toast.info(`File selected: ${file.name}. File processing not yet supported.`);
        }}
      />
    </div>
  );
};

export { ChatInput };
