"use client"

import { useState, useRef } from "react"
import { useChatStore } from "@/store/chatStore"
import { useCanvasStore } from "@/store/canvasStore"
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search"
import { generateImageFromPrompt } from '@/lib/generate-image'
import { generateAdsFromProductUrl, getAdGenerationStreamUrl, cancelAdGeneration } from '@/lib/generate-ad'
import { useEventSource } from '@/lib/use-event-source'
import { Button } from "@/components/ui/button"
import { Loader2, X, Store } from "lucide-react"
import { cn } from "@/lib/utils"

// Simple function to test if an image URL is valid
function testImageUrl(url: string) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export function ChatInput() {
  const [isLoading, setIsLoading] = useState(false)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const addMessage = useChatStore((state) => state.addMessage)
  const addImage = useCanvasStore((state) => state.addImage)
  const objects = useCanvasStore((state) => state.objects)
  const [isCancelling, setIsCancelling] = useState(false)
  const [inputValue, setInputValue] = useState("")
  
  // Detect when user is typing an ad command
  const isTypingAdCommand = inputValue.trim().toLowerCase().startsWith('/ad')
  
  // SSE connection for ad generation
  const { connect, disconnect } = useEventSource(undefined, {
    onEvent: (eventName, data) => handleAdGenerationEvent(eventName, data),
    autoConnect: false,
  });

  // Function to handle input changes to detect ad commands
  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  // Function to proxy an image URL through our proxy API
  const getProxiedImageUrl = (url: string) => {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // Function to check if an image already exists on the canvas
  const imageExistsOnCanvas = (url: string): boolean => {
    // Get the base URL without the proxy
    const isProxied = url.startsWith('/api/proxy-image');
    const originalUrl = isProxied 
      ? decodeURIComponent(url.split('?url=')[1] || '')
      : url;
    
    // Check if any object on the canvas has this URL (or its proxied version)
    return objects.some(obj => {
      if (!obj.src) return false;
      
      const objIsProxied = obj.src.startsWith('/api/proxy-image');
      const objOriginalUrl = objIsProxied 
        ? decodeURIComponent(obj.src.split('?url=')[1] || '')
        : obj.src;
      
      return objOriginalUrl === originalUrl || obj.src === url;
    });
  };

  // Handle event data from SSE stream
  const handleAdGenerationEvent = (eventName: string, data: any) => {
    console.log(`[AdGeneration] Received ${eventName} event:`, data);
    
    // Handle standard SSE events
    switch (eventName) {
      // Handle progress events for each stage
      case 'plan':
      case 'page_scrape_started':
      case 'page_scrape_done':
      case 'image_extraction_started':
      case 'image_extraction_done':
      case 'research_started':
      case 'research_done':
      case 'concepts_started':
      case 'concepts_done':
      case 'ideas_started':
      case 'ideas_done':
      case 'images_started':
      case 'image_generation_progress':
      case 'images_done':
        // Handle progress updates
        if (data.message) {
          addMessage({ 
            type: 'agentProgress', 
            content: data.message,
            subType: 'ad_concept'
          });
        } else {
          // Use stage name if no message is provided
          const stageLabel = eventName.replace(/_/g, ' ');
          addMessage({ 
            type: 'agentProgress', 
            content: `${stageLabel} (${data.pct || 0}%)`,
            subType: 'ad_concept'
          });
        }
        break;
        
      // Show generated concepts if available
      case 'concepts_done':
        if (data.data?.concepts && data.data.concepts.length > 0) {
          const conceptNames = data.data.concepts
            .map((c: any) => c.concept_name)
            .join(', ');
            
          addMessage({
            type: 'agentProgress',
            content: `Generated concepts: ${conceptNames}`,
            subType: 'ad_concept'
          });
        }
        break;
        
      // Handle completion with images
      case 'done':
        // First add a completion message
        addMessage({
          type: 'agentOutput',
          content: data.message || 'Ad generation complete!',
          subType: 'ad_concept'
        });
        
        // Then add each image to the canvas with spacing if images are provided
        if (data.data?.imageUrls && data.data.imageUrls.length > 0) {
          // Handle external images with proxy
          const imageUrls = data.data.imageUrls;
          imageUrls.forEach((imageUrl: string, index: number) => {
            // Skip if the image already exists on canvas
            if (imageExistsOnCanvas(imageUrl)) {
              console.log('[AdGeneration] Image already exists on canvas, skipping:', imageUrl);
              return;
            }
            
            // Handle external images with proxy
            const isExternalUrl = imageUrl.startsWith('http') && !imageUrl.startsWith('/api/proxy-image');
            const proxiedUrl = isExternalUrl 
              ? getProxiedImageUrl(imageUrl)
              : imageUrl;
            
            // Add to canvas with proper spacing - offset each image horizontally
            setTimeout(() => {
              addImage(proxiedUrl, 20 + (index * 420), 20);
            }, index * 100); // Staggered adding for better performance
          });
        }
        
        // Reset state
        setCurrentJobId(null);
        setIsLoading(false);
        break;
        
      // Handle errors
      case 'error':
        addMessage({
          type: 'agentOutput',
          content: `Error: ${data.message || 'Unknown error'} ${data.errorCode ? `(${data.errorCode})` : ''}`,
          subType: 'ad_concept'
        });
        setCurrentJobId(null);
        setIsLoading(false);
        break;
        
      // Handle cancellation
      case 'cancelled':
        addMessage({
          type: 'agentOutput',
          content: 'Ad generation was cancelled',
          subType: 'ad_concept'
        });
        setCurrentJobId(null);
        setIsLoading(false);
        break;
        
      // Handle heartbeats (just log, don't display)
      case 'heartbeat':
        console.log('[AdGeneration] Heartbeat received:', data);
        break;
        
      // Handle generic messages or events not specified above
      default:
        if (data.message) {
          addMessage({
            type: 'agentProgress',
            content: data.message,
            subType: 'ad_concept'
          });
        }
        break;
    }
  };

  // Parse ad command for product URL and image count
  const parseAdCommand = (command: string): { productUrl: string, imageCount: number } => {
    // Remove the /ad prefix and trim whitespace
    const commandText = command.replace(/^\/ad\s+/i, '').trim();
    
    // Look for image count flag at the end of the command (e.g., --count=4 or -n=4)
    const countMatch = commandText.match(/(--count=|--n=|-n=)(\d+)$/);
    
    let imageCount = 4; // Default value
    let productUrl = commandText;
    
    if (countMatch) {
      // Extract count and remove the flag from the URL
      imageCount = parseInt(countMatch[2], 10);
      productUrl = commandText.replace(countMatch[0], '').trim();
    }
    
    return { productUrl, imageCount };
  };

  // Handle ad generation command
  const handleAdGeneration = async (command: string) => {
    try {
      const { productUrl: parsedUrl, imageCount } = parseAdCommand(command);
      
      // Use the parsed URL as a mutable variable
      let productUrl = parsedUrl;
      
      if (!productUrl) {
        addMessage({ 
          type: 'agentOutput',
          content: 'Error: Please provide a product URL after /ad command'
        });
        setIsLoading(false);
        return;
      }
      
      // Check if URL is reasonably valid
      if (!productUrl.match(/^https?:\/\/.+\..+/)) {
        // Try to fix it if it's just missing the protocol
        if (!productUrl.startsWith('http')) {
          productUrl = 'https://' + productUrl;
        } else {
          addMessage({ 
            type: 'agentOutput',
            content: 'Error: Please provide a valid product URL (e.g., https://example.com/product)'
          });
          setIsLoading(false);
          return;
        }
      }
      
      // First check API health
      console.log('[AdGeneration] Checking ad generation API health...');
      try {
        const healthResponse = await fetch('/api/proxy/healthz');
        if (!healthResponse.ok) {
          throw new Error(`Health check failed with status: ${healthResponse.status}`);
        }
        const responseText = await healthResponse.text();
        if (responseText !== 'pong') {
          throw new Error('Invalid health check response');
        }
        console.log('[AdGeneration] Ad generation API is healthy');
      } catch (healthError: any) {
        console.error('[AdGeneration] API health check failed:', healthError);
        addMessage({
          type: 'agentOutput',
          content: `Error: Ad generation service is unavailable. Please try again later.`,
          subType: 'ad_concept'
        });
        setIsLoading(false);
        return;
      }
      
      // Add initial progress message
      addMessage({ 
        type: 'agentProgress', 
        content: `Starting ad generation for product: ${productUrl}`,
        subType: 'ad_concept' 
      });
      
      // Start the generation job
      const jobId = await generateAdsFromProductUrl(productUrl, imageCount);
      console.log(`[AdGeneration] Job started with ID: ${jobId}`);
      setCurrentJobId(jobId);
      
      // Add a message about the number of images being generated
      addMessage({ 
        type: 'agentProgress', 
        content: `Ad generation started. Will create ${imageCount} image${imageCount !== 1 ? 's' : ''}.`,
        subType: 'ad_concept' 
      });
      
      // Get the stream URL
      const streamUrl = getAdGenerationStreamUrl(jobId);
      console.log(`[AdGeneration] Connecting to stream URL: ${streamUrl}`);
      
      // Connect to the stream and start getting updates
      connect(streamUrl);
      
    } catch (error: any) {
      console.error('[AdGeneration] Error:', error);
      addMessage({ 
        type: 'agentOutput', 
        content: `Error: ${error.message || 'Failed to start ad generation'}`,
        subType: 'ad_concept'
      });
      setIsLoading(false);
    }
  };

  // Handle cancelling a generation job
  const handleCancel = async () => {
    if (!currentJobId || isCancelling) return;
    
    try {
      setIsCancelling(true);
      addMessage({
        type: 'agentProgress',
        content: 'Cancelling ad generation...'
      });
      
      await cancelAdGeneration(currentJobId);
      
      // We don't need to show a cancellation message here
      // as the SSE stream should send a 'cancelled' event
      
      // Disconnect from the SSE stream
      disconnect();
    } catch (error: any) {
      console.error('[AdGeneration] Error cancelling job:', error);
      addMessage({
        type: 'agentOutput',
        content: `Error cancelling job: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsCancelling(false);
      setIsLoading(false);
      setCurrentJobId(null);
    }
  };

  const handleSubmit = async (value: string, withSearch: boolean) => {
    if (!value.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Add user message
      addMessage({ type: "userInput", content: value });
      console.log('[ChatInput] User submitted prompt:', value);
      
      // Detect /ad command for ad generation
      const isAdRequest = value.trim().toLowerCase().startsWith('/ad');
      if (isAdRequest) {
        await handleAdGeneration(value);
        return;
      }
      
      // For any other input, just show a simple response
      addMessage({ 
        type: 'agentOutput', 
        content: 'To generate ads, use the /ad command followed by a product URL.'
      });
      
    } catch (error: any) {
      console.error('[ChatInput] Error handling input:', error);
      
      addMessage({
        type: 'agentOutput',
        content: `Error: ${error.message || 'An unexpected error occurred'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {(isLoading && currentJobId) && (
        <div className="absolute right-12 top-2 z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
            disabled={isCancelling}
            onClick={handleCancel}
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-1" />
            )}
            {isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
        </div>
      )}
      {isTypingAdCommand && (
        <div className="absolute left-12 top-2 z-10">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs border border-emerald-200">
            <Store className="h-3 w-3" />
            <span>Ad Generator Active</span>
          </div>
        </div>
      )}
      <AIInputWithSearch
        placeholder={isTypingAdCommand 
          ? "Enter product URL... (e.g., https://example.com/product --count=4)" 
          : "Ask Popmint or type /ad to generate ads..."}
        onSubmit={handleSubmit}
        onChange={handleInputChange}
        disabled={isLoading}
        className={cn(
          "shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c] bg-white rounded-[10px]",
          isTypingAdCommand && "border-l-4 border-l-emerald-400"
        )}
      />
    </div>
  );
}
