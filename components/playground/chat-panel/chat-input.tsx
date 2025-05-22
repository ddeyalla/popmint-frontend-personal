import React, { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useChatStore, AdGenerationStage } from "@/store/chatStore"; 
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import { generateAdsFromProductUrl, getAdGenerationStreamUrl, cancelAdGeneration } from "@/lib/generate-ad";

interface ChatInputProps {
  disabled?: boolean;
}

// Track step start times for better timing
const stepStartTimes = new Map<string, { stage: string; startTime: Date }>();

const ChatInput = ({ disabled: propDisabled = false }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [hasValidUrl, setHasValidUrl] = useState(false);

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

  // Listen for ad generation trigger from homepage
  useEffect(() => {
    const handleTriggerAdGeneration = (event: CustomEvent) => {
      const { content, productUrl } = event.detail;
      if (content && productUrl) {
        handleAdGeneration(content, productUrl);
      }
    };

    window.addEventListener('trigger-ad-generation', handleTriggerAdGeneration as EventListener);
    
    return () => {
      window.removeEventListener('trigger-ad-generation', handleTriggerAdGeneration as EventListener);
    };
  }, []);

  // Check for valid URL in input
  useEffect(() => {
    const urlMatch = inputValue.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
    setHasValidUrl(!!urlMatch && urlMatch.length > 0);
  }, [inputValue]);

  // Map backend SSE stages to our AdGenerationStage
  const mapBackendStage = (backendStage: string): AdGenerationStage => {
    switch (backendStage) {
      case 'plan':
        return 'planning';
      case 'page_scrape_started':
      case 'page_scrape_done':
        return 'scraping';
      case 'image_extraction_started':
      case 'image_extraction_done':
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

  // Handle SSE events
  const handleSSEEvent = useCallback((eventData: any) => {
    try {
      const { jobId, stage, message, data, pct = 0, errorCode } = eventData || {};
      
      if (!jobId || !stage) {
        return;
      }
      
      const eventJobId = jobId as string;
      const mappedStage = mapBackendStage(stage);

      // Track step start times
      const stepKey = `${eventJobId}-${stage}`;
      
      // For "*_started" events, record start time
      if (stage.endsWith('_started')) {
        stepStartTimes.set(stepKey, { stage, startTime: new Date() });
      }
      
      // For "*_done" events, calculate duration and complete step
      if (stage.endsWith('_done')) {
        const startKey = `${eventJobId}-${stage.replace('_done', '_started')}`;
        const startData = stepStartTimes.get(startKey);
        
        if (startData) {
          const duration = new Date().getTime() - startData.startTime.getTime();
          completeAdGenerationStep(
            eventJobId, 
            mappedStage, 
            `✅ ${getStageDisplayName(stage)}`,
            { 
              ...data,
              duration,
              stage: stage.replace('_done', ''),
              startTime: startData.startTime,
              endTime: new Date()
            }
          );
          stepStartTimes.delete(startKey);
        } else {
          completeAdGenerationStep(
            eventJobId, 
            mappedStage, 
            `✅ ${getStageDisplayName(stage)}`,
            data
          );
        }
        return;
      }

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
          
          // Add images to canvas
          if (data?.imageUrls && data.imageUrls.length > 0) {
            addImagesToCanvas(data.imageUrls);
          }
          
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
            message: 'Checking your product details...',
          });
          break;

        case 'research_started':
          updateAdGeneration(eventJobId, 'researching', {
            progress: pct,
            message: 'Researching your product...',
          });
          break;

        case 'concepts_started':
          updateAdGeneration(eventJobId, 'concepting', {
            progress: pct,
            message: 'Generating ad concepts...',
          });
          break;

        case 'ideas_started':
          updateAdGeneration(eventJobId, 'ideating', {
            progress: pct,
            message: 'Generating ad copy ideas...',
          });
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

        case 'image_extraction_started':
          // No UI updates for this stage
          break;

        case 'heartbeat':
          // Heartbeat events - no UI updates needed
          break;

        default:
          updateAdGeneration(eventJobId, mappedStage, {
            progress: pct,
            message: message || `Processing ${stage}...`,
          });
          break;
      }
    } catch (error) {
      console.error('Error handling SSE event:', error, 'Event data:', eventData);
    }
  }, [updateAdGeneration, completeAdGenerationStep, addGeneratedImage, setAdGenerationError, completeAdGeneration, setIsProcessing]);

  // Helper function to get display names for stages
  const getStageDisplayName = (stage: string): string => {
    switch (stage) {
      case 'page_scrape_done':
        return 'Product details extracted';
      case 'research_done':
        return 'Research completed';
      case 'concepts_done':
        return 'Ad concepts generated';
      case 'ideas_done':
        return 'Ad ideas generated';
      case 'images_done':
        return 'Ads generated';
      default:
        return stage.replace('_done', '').replace('_', ' ');
    }
  };

  // Helper function to add images to canvas
  const addImagesToCanvas = async (imageUrls: string[]) => {
    try {
      const { useCanvasStore } = await import('@/store/canvasStore');
      const canvasStore = useCanvasStore.getState();
      
      // Constants for positioning
      const DEFAULT_IMAGE_WIDTH = 180;
      const IMAGE_SPACING = 40; // 40px spacing between images
      const START_X = 20;
      const VERTICAL_SPACING = 40;
      
      // Calculate starting Y position - place below existing content
      const existingObjects = canvasStore.objects;
      let startY = 20;
      
      if (existingObjects.length > 0) {
        const maxY = Math.max(...existingObjects.map(obj => (obj.y || 0) + (obj.height || 100)));
        startY = maxY + VERTICAL_SPACING;
      }
      
      // Add each image in a single row with 40px spacing
      imageUrls.forEach((url: string, index: number) => {
        try {
          // Handle proxying for external URLs
          const isExternalUrl = url.startsWith('http') && !url.startsWith('/api/proxy-image');
          const proxiedUrl = isExternalUrl 
            ? `/api/proxy-image?url=${encodeURIComponent(url)}`
            : url;
            
          // Check if image already exists on canvas
          const imageExists = existingObjects.some(obj => {
            if (!obj.src) return false;
            
            const objIsProxied = obj.src.startsWith('/api/proxy-image');
            const objOriginalUrl = objIsProxied 
              ? decodeURIComponent(obj.src.split('?url=')[1] || '')
              : obj.src;
            
            return objOriginalUrl === url || obj.src === url || 
                  objOriginalUrl === proxiedUrl || obj.src === proxiedUrl;
          });
          
          if (!imageExists) {
            // Calculate X position: start + index * (image_width + spacing)
            const x = START_X + index * (DEFAULT_IMAGE_WIDTH + IMAGE_SPACING);
            canvasStore.addImage(proxiedUrl, x, startY);
          }
        } catch (imgErr) {
          console.error(`Error adding image ${index} to canvas:`, imgErr);
        }
      });
    } catch (error) {
      console.error('Error adding images to canvas:', error);
    }
  };

  // Connect to SSE stream with retry logic
  const connectSSE = useCallback((jobId: string, retryCount = 0) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const streamUrl = getAdGenerationStreamUrl(jobId);

    let eventSource: EventSource;
    try {
      eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      if (currentJobId && isProcessing) {
        setAdGenerationError(currentJobId, 'Failed to connect to generation stream');
      }
      setIsProcessing(false);
      return;
    }

    eventSource.onopen = () => {
      // Set a timeout to detect hanging connections
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      connectionTimeoutRef.current = setTimeout(() => {
        if (isProcessing) {
          eventSource.close();
          if (retryCount < 3) {
            connectSSE(jobId, retryCount + 1);
          } else {
            setAdGenerationError(jobId, 'Connection timeout. Please try again.');
            setIsProcessing(false);
            disconnectSSE();
          }
        }
      }, 30000);
    };

    eventSource.onmessage = (event) => {
      try {
        if (!event.data || event.data === 'undefined' || event.data === 'null') {
          return;
        }
        
        const data = JSON.parse(event.data);
        handleSSEEvent(data);
      } catch (error) {
        console.error('SSE Parse Error:', error, 'Raw data:', event.data);
      }
    };

    eventSource.onerror = (error: Event) => {
      console.error('SSE Error:', {
        error,
        readyState: eventSource.readyState,
        url: streamUrl,
        jobId: jobId,
        retryCount
      });
      
      if (isProcessing) {
        if (retryCount < 3 && eventSource.readyState === EventSource.CLOSED) {
          setTimeout(() => {
            if (isProcessing) {
              connectSSE(jobId, retryCount + 1);
            }
          }, Math.pow(2, retryCount) * 1000);
          return;
        }
        
        setAdGenerationError(jobId, 'Connection lost. Please try again.');
      }
      setIsProcessing(false);
      disconnectSSE();
    };

    // Handle named events
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
          if (!event.data || event.data === 'undefined' || event.data === 'null') {
            return;
          }
          
          const data = JSON.parse(event.data);
          handleSSEEvent({ ...data, stage: eventType });
        } catch (error) {
          console.error(`SSE ${eventType} Parse Error:`, error, 'Raw data:', event.data);
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
    stepStartTimes.clear();
  }, []);

  // Handle ad generation
  const handleAdGeneration = async (content: string, productUrl?: string) => {
    if (!productUrl) {
      const urlMatch = content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
      if (urlMatch && urlMatch.length > 0) {
        productUrl = urlMatch[0];
        if (!productUrl.startsWith('http')) {
          productUrl = 'https://' + productUrl;
        }
      }
    }

    if (!productUrl) {
      toast.error('No valid product URL found');
      return;
    }

    setIsProcessing(true);
    
    try {
      const backendJobId = await generateAdsFromProductUrl(productUrl);
      
      if (!backendJobId) {
        throw new Error('No job ID returned from backend');
      }
      
      setCurrentJobId(backendJobId);
      startAdGeneration(backendJobId, content);
      connectSSE(backendJobId);
      
    } catch (error: any) {
      console.error('Ad Generation Error:', error);
      toast.error(`Failed to start ad generation: ${error.message}`);
      setIsProcessing(false);
      setCurrentJobId(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isProcessing) return;

    // Check if message contains a URL for ad generation
    const urlMatch = trimmedValue.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
    
    if (urlMatch && urlMatch.length > 0) {
      // Handle ad generation
      await handleAdGeneration(trimmedValue);
    } else {
      // Show toast if no URL is present
      toast.error('Add product link to generate ad', {
        position: 'bottom-right'
      });
      return;
    }

    setInputValue("");
  };

  // Handle cancellation
  const handleCancel = async () => {
    if (!currentJobId) {
      setIsProcessing(false);
      disconnectSSE();
      return;
    }

    try {
      await cancelAdGeneration(currentJobId);
      setAdGenerationError(currentJobId, 'Generation cancelled by user');
      toast.success('Ad generation cancelled');
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error(`Failed to cancel: ${error.message}`);
    } finally {
      setIsProcessing(false);
      disconnectSSE();
    }
  };

  // Show cancel confirmation modal
  const showCancelModal = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmed = window.confirm('Are you sure you want to cancel the ad generation?');
      resolve(confirmed);
    });
  };

  return (
    <div className="relative w-full px-4 pb-2 pt-2 md:pt-0 lg:pt-0 xl:pt-0">
      <AIInputWithSearch
        onChange={setInputValue}
        onSubmit={handleSubmit}
        placeholder={hasValidUrl 
          ? "Paste a product URL to generate ads or type a message..."
          : "Add product link to generate ad"
        }
        disabled={propDisabled} // Don't disable based on processing
        minHeight={52}
        isProcessing={isProcessing}
        onCancel={handleCancel}
        showCancelModal={showCancelModal}
        onFileSelect={(file) => {
          toast.info(`File selected: ${file.name}. File processing not yet supported.`);
        }}
      />
    </div>
  );
};

export { ChatInput };
