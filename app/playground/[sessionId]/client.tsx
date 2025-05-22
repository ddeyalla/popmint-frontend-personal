"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel";
import { CanvasArea } from "@/components/playground/canvas/canvas-area";
import { useChatStore } from "@/store/chatStore";
import { useCanvasStore } from "@/store/canvasStore";
import { CollapsedOverlay } from "@/components/playground/collapsed-overlay";
import { cn } from "@/lib/utils";



interface ClientSidePlaygroundProps {
  sessionId: string;
}

export default function ClientSidePlayground({ sessionId }: ClientSidePlaygroundProps) {
  const { addMessage } = useChatStore();
  const isInitialized = useRef(false);
  const isSidebarCollapsed = useCanvasStore((state) => state.isSidebarCollapsed);
  const [isUILoading, setIsUILoading] = useState(true);
  const canvasAreaWrapperRef = useRef<HTMLDivElement>(null);

  // Helper functions for adding messages with proper roles
  const addUserMessage = (content: string, imageUrls?: string[]) => {
    return addMessage({
      type: "text",
      role: "user", 
      content,
      ...(imageUrls ? { imageUrls } : {})
    });
  };
  
  const addAgentProgress = (content: string, subType?: string, imageUrls?: string[], details?: string) => {
    return addMessage({
      type: "agent_progress",
      role: "assistant",
      content,
      ...(subType ? { subType } : {}),
      ...(imageUrls ? { imageUrls } : {}),
      ...(details ? { details } : {})
    });
  };
  
  const addAgentOutput = (content: string, subType?: string, imageUrls?: string[]) => {
    return addMessage({
      type: "agent_output", 
      role: "assistant",
      content,
      ...(subType ? { subType } : {}),
      ...(imageUrls ? { imageUrls } : {})
    });
  };

  // Precompute styles only when isSidebarCollapsed changes
  const canvasStyles = useMemo(() => {
    return { 
      willChange: "transform",
      transform: isSidebarCollapsed ? 'translateX(0)' : 'translateX(372px)',
      width: isSidebarCollapsed ? '100%' : 'calc(100% - 372px)'
    };
  }, [isSidebarCollapsed]);

  const containerClassName = useMemo(() => {
    return cn(
      "flex h-screen w-screen transition-all duration-300 ease-in-out", 
      isSidebarCollapsed ? "p-2" : "p-2"
    );
  }, [isSidebarCollapsed]);

  const sidebarClassName = useMemo(() => {
    return cn(
      "fixed left-0 top-0 h-full w-[372px] bg-white z-40 transition-transform duration-300 ease-in-out",
      isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
    );
  }, [isSidebarCollapsed]);

  // Remove the expensive logging and setTimeout
  useEffect(() => {
    // If we need to do something when sidebar state changes, do it more efficiently
    if (canvasAreaWrapperRef.current) {
      // Force a reflow for the canvas only once after sidebar toggling
      canvasAreaWrapperRef.current.offsetWidth; // Reading this property forces a reflow
      
      // If we need to notify any components that depend on canvas size,
      // we can dispatch a custom event instead of using timeouts
      const resizeEvent = new CustomEvent('canvas-resize', { detail: { collapsed: isSidebarCollapsed } });
      window.dispatchEvent(resizeEvent);
    }
  }, [isSidebarCollapsed]);


  // Initialize UI and chat immediately, then handle image generation in the background
  useEffect(() => {
    // Run initialization only once
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializePlayground = async () => {
      try {
        // Read from localStorage
        const initialMessageJson = localStorage.getItem("popmint-initial-message");
        const shouldProcessImageStr = localStorage.getItem("popmint-process-image");
        const shouldGenerateAdStr = localStorage.getItem("popmint-generate-ad");
        const promptToProcess = localStorage.getItem("popmint-prompt-to-process");

        // Parse values
        const shouldProcessImage = shouldProcessImageStr === "true";
        const shouldGenerateAd = shouldGenerateAdStr === "true";
        let userPrompt = promptToProcess || "";

        // Initialize chat UI with initial message
        if (initialMessageJson) {
          try {
            const initialMessage = JSON.parse(initialMessageJson);
            // Add the user's message to the chat
            addUserMessage(initialMessage.content, initialMessage.imageUrls);
            
            // Use content from initialMessage if promptToProcess wasn't set
            if (!userPrompt && initialMessage.content) {
              userPrompt = initialMessage.content;
            }
            
            // UI is ready now, remove loading state
            setIsUILoading(false);
            
            // Handle ad generation if flag is set
            if (shouldGenerateAd && initialMessage.content) {
              generateAd(initialMessage.content);
            }
            // Start image generation in background AFTER UI is loaded
            else if (userPrompt && shouldProcessImage) {
              // Add a progress message to show processing
              addAgentProgress('Processing your request...');
              
              // Run image generation as a non-blocking background process
              generateImage(userPrompt);
            }
          } catch (error) {
            console.error("[Playground] Error parsing initialMessageJson:", error);
            setIsUILoading(false);
          }
        } else {
          // No initial message, show demo content or clear UI
          if (useChatStore.getState().messages.length === 0) {
            showDemoContent();
          }
          setIsUILoading(false);
        }

        // Clear localStorage flags
        localStorage.removeItem("popmint-generate-ad");
        localStorage.removeItem("popmint-process-image");
        localStorage.removeItem("popmint-prompt-to-process");
      } catch (error) {
        console.error("[Playground] Error during initialization:", error);
        setIsUILoading(false);
        
        // Show error message to user
                  addAgentOutput(`Error initializing playground: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    // Non-blocking image generation function
    const generateImage = async (prompt: string) => {
      try {
        console.log('[Playground] Starting image generation in background for prompt:', prompt);
        
        const response = await fetch('/api/agent/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Could not read server response body');
        }
        
        const decoder = new TextDecoder();
        let buffer = '';
        
        // Process the SSE stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Clean up localStorage flags after successful processing
            localStorage.removeItem("popmint-process-image");
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'agent_progress') {
                  addAgentProgress(data.content);
                } else if (data.type === 'agent_output') {
                  const hasImages = data.imageUrls && data.imageUrls.length > 0;
                  
                  // Add the message to chat
                  addAgentOutput(data.content, hasImages ? 'image_generated' : undefined, hasImages ? data.imageUrls : undefined);
                  
                  // If there are images, add them to the canvas
                  if (hasImages) {
                    await addImagesToCanvas(data.imageUrls);
                  }
                }
              } catch (parseError) {
                console.error('[Playground] Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } catch (error: any) {
        console.error('[Playground] Error with image generation:', error);
        addAgentOutput(`Error: ${error.message || 'Failed to generate image'}`);
      } finally {
        // Always clean up when done, regardless of success/failure
        localStorage.removeItem("popmint-process-image");
      }
    };

    // Generate ads for product URLs
    const generateAd = async (content: string) => {
      try {
        // Add a progress message
        addAgentProgress('Starting ad generation...', 'ad_concept');

        // Extract product URL from text
        let productUrl = '';
        let imageCount = 4; // Default count
        
        // Try to extract URL from content
        const urlMatch = content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
        if (urlMatch && urlMatch.length > 0) {
          productUrl = urlMatch[0];
        }

        if (!productUrl) {
          addAgentOutput('No valid product URL found. Please provide a URL to generate ads.', 'ad_concept');
          return;
        }

        // Make sure URL starts with http
        if (!productUrl.startsWith('http')) {
          productUrl = 'https://' + productUrl;
        }

        // First check API health
        console.log('[Playground] Checking ad generation API health...');
        try {
          const healthResponse = await fetch('/api/proxy/healthz');
          if (!healthResponse.ok) {
            throw new Error(`Health check failed with status: ${healthResponse.status}`);
          }
          console.log('[Playground] Ad generation API is healthy');
        } catch (healthError: any) {
          console.error('[Playground] API health check failed:', healthError);
          addAgentOutput('Ad generation service is unavailable. Please try again later.', 'ad_concept');
          return;
        }

        // Generate ad using adGenerationService from generate-ad.ts
        addAgentProgress(`Analyzing product from URL: ${productUrl}`, 'ad_concept');
        
        // Import the ad generation functions
        const { generateAdsFromProductUrl, getAdGenerationStreamUrl } = await import('@/lib/generate-ad');
        
        // Start the generation job
        const jobId = await generateAdsFromProductUrl(productUrl, imageCount);
        console.log(`[Playground] Ad generation job started with ID: ${jobId}`);
        
        // Connect to the SSE stream
        addAgentProgress(`Ad generation started. Will create ${imageCount} image${imageCount !== 1 ? 's' : ''}.`, 'ad_concept');
        
        // Get the stream URL
        const streamUrl = getAdGenerationStreamUrl(jobId);
        console.log(`[Playground] Connecting to stream URL: ${streamUrl}`);
        
        // Connect to the stream using EventSource directly
        const eventSource = new EventSource(streamUrl);
        
        console.log('[Playground] EventSource created, readyState:', eventSource.readyState);
        
        // Setup connection event handlers
        eventSource.onopen = () => {
          console.log('[Playground] SSE connection opened successfully');
        };
        
        eventSource.onerror = (error) => {
          console.error('[Playground] SSE connection error:', error);
          console.error('[Playground] EventSource readyState:', eventSource.readyState);
          addAgentOutput('Connection error occurred while generating ads.', 'ad_concept');
        };
        
        // Single message handler - process all events through onmessage
        eventSource.onmessage = (event) => {
          try {
            console.log('[Playground] SSE message received:', event.data);
            const data = JSON.parse(event.data);
            console.log('[Playground] Parsed SSE data:', data);
            
            // Handle each stage type
            switch (data.stage) {
              case 'plan':
                console.log('[Playground] Plan stage:', data);
                addAgentProgress(data.message || 'Smart planning phase...', 'ad_concept');
                break;
                
              case 'page_scrape_started':
                console.log('[Playground] Page scrape started:', data);
                addAgentProgress(data.message || 'Analyzing product page...', 'ad_concept');
                break;
                
              case 'page_scrape_done':
                console.log('[Playground] Page scrape done:', data);
                addAgentProgress(data.message || 'Product information collected.', 'ad_concept');
                
                // Show detailed product info if available
                if (data.data?.scraped_content_summary) {
                  const summary = data.data.scraped_content_summary;
                  const formattedSummary = Object.entries(summary)
                    .filter(([key, value]) => value && typeof value === 'string' && value.trim() !== '')
                    .map(([key, value]) => `• ${key.replace(/_/g, ' ')}: ${value}`)
                    .join('\n');
                  
                  if (formattedSummary) {
                    addAgentProgress(`📋 Product details:\n${formattedSummary}`, 'ad_concept', undefined, 'Scraped product details');
                  }
                }
                break;
                
              case 'image_extraction_started':
                console.log('[Playground] Image extraction started:', data);
                addAgentProgress(data.message || 'Extracting product images...', 'ad_concept');
                break;
                
              case 'image_extraction_done':
                console.log('[Playground] Image extraction done:', data);
                addAgentProgress(data.message || 'Product images extracted.', 'ad_concept');
                break;
                
              case 'research_started':
                console.log('[Playground] Research started:', data);
                addAgentProgress(data.message || 'Researching product market...', 'ad_concept');
                break;
                
              case 'research_done':
                console.log('[Playground] Research done:', data);
                addAgentProgress(data.message || 'Market research completed.', 'ad_concept');
                
                // Add the research summary if available
                if (data.data?.summary) {
                  addAgentProgress(`📊 Research findings:\n${data.data.summary}`, 'ad_concept', undefined, 'Research report');
                }
                break;
                
              case 'concepts_started':
                console.log('[Playground] Concepts started:', data);
                addAgentProgress(data.message || 'Generating ad concepts...', 'ad_concept');
                break;
                
              case 'concepts_done':
                console.log('[Playground] Concepts done:', data);
                addAgentProgress(data.message || 'Ad concepts generated.', 'ad_concept');
                
                // Format and display concepts if available
                if (data.data?.concepts && data.data.concepts.length > 0) {
                  const conceptsFormatted = data.data.concepts
                    .map((c: any, index: number) => `${index + 1}. ${c.concept_name}`)
                    .join('\n');
                    
                  addAgentProgress(`🎨 Generated ad concepts:\n${conceptsFormatted}`, 'ad_concept', undefined, 'Ad concepts');
                }
                break;
                
              case 'ideas_started':
                console.log('[Playground] Ideas started:', data);
                addAgentProgress(data.message || 'Creating ad ideas and copy...', 'ad_concept');
                break;
                
              case 'ideas_done':
                console.log('[Playground] Ideas done:', data);
                addAgentProgress(data.message || 'Ad copy and ideas generated.', 'ad_concept');
                
                // Add the ideas with details if available
                if (data.data?.ideas && data.data.ideas.length > 0) {
                  const ideasFormatted = data.data.ideas
                    .map((idea: any, index: number) => {
                      const title = idea.title || `Ad Idea ${index + 1}`;
                      const copy = idea.copy || '';
                      return `${index + 1}. ${title}\n   ${copy}`;
                    })
                    .join('\n\n');
                    
                  addAgentProgress(`💡 Ad copy ideas:\n${ideasFormatted}`, 'ad_concept', undefined, 'Ad copy ideas');
                }
                break;
                
              case 'images_started':
                console.log('[Playground] Images started:', data);
                addAgentProgress(data.message || 'Generating ad images...', 'ad_concept');
                break;
                
              case 'image_generation_progress':
                console.log('[Playground] Image generation progress:', data);
                const progressMsg = data.message || `Generating image ${data.data?.current_image || ''} of ${data.data?.total_images || ''} (${data.pct || 0}%)`;
                addAgentProgress(progressMsg, 'ad_concept', data.data?.image_url ? [data.data.image_url] : undefined);
                break;
                
              case 'images_done':
                console.log('[Playground] Images done:', data);
                addAgentProgress(data.message || 'Ad images generated.', 'ad_concept');
                break;
                
              case 'done':
                console.log('[Playground] Generation complete:', data);
                if (data.data?.imageUrls) {
                  addAgentOutput(data.message || 'Ad generation complete!', 'ad_concept');
                  // Add images to canvas
                  addImagesToCanvas(data.data.imageUrls);
                } else {
                  addAgentOutput(data.message || 'Ad generation completed.', 'ad_concept');
                }
                eventSource.close();
                break;
                
              case 'error':
                console.error('[Playground] Generation error:', data);
                const errorMsg = `Error: ${data.message || 'Unknown error'} (${data.errorCode || 'UNKNOWN_ERROR'})`;
                addAgentOutput(errorMsg, 'ad_concept');
                eventSource.close();
                break;
                
              case 'heartbeat':
                console.log('[Playground] Heartbeat received:', data);
                // Don't show heartbeats in UI
                break;
                
              default:
                console.log('[Playground] Unknown stage received:', data.stage, data);
                if (data.message) {
                  addAgentProgress(data.message, 'ad_concept');
                }
                break;
            }
          } catch (e) {
            console.error('[Playground] Error parsing SSE data:', event.data, e);
            addAgentOutput('Error processing ad generation updates.', 'ad_concept');
          }
        };
        
      } catch (error: any) {
        console.error('[Playground] Error with ad generation:', error);
        addAgentOutput(`Error: ${error.message || 'An error occurred during ad generation'}`, 'ad_concept');
      }
    };

    // Helper function to add images to canvas
    const addImagesToCanvas = async (imageUrls: string[]) => {
      try {
        const canvasStore = useCanvasStore.getState();
        
        await Promise.all(imageUrls.map(async (url: string, i: number) => {
          try {
            // Handle proxying for external URLs
            const isExternalUrl = url.startsWith('http') && !url.startsWith('/api/proxy-image');
            const proxiedUrl = isExternalUrl 
              ? `/api/proxy-image?url=${encodeURIComponent(url)}`
              : url;
              
            // Check if image already exists on canvas
            const imageExists = canvasStore.objects.some(obj => {
              if (!obj.src) return false;
              
              const objIsProxied = obj.src.startsWith('/api/proxy-image');
              const objOriginalUrl = objIsProxied 
                ? decodeURIComponent(obj.src.split('?url=')[1] || '')
                : obj.src;
              
              return objOriginalUrl === url || obj.src === url || 
                    objOriginalUrl === proxiedUrl || obj.src === proxiedUrl;
            });
            
            if (!imageExists) {
              canvasStore.addImage(proxiedUrl, 20 + (i * 400), 20);
            }
          } catch (imgErr) {
            console.error(`[Playground] Error adding image to canvas:`, imgErr);
          }
        }));
      } catch (error) {
        console.error('[Playground] Error adding images to canvas:', error);
      }
    };

    // Helper function to show demo content
    const showDemoContent = async () => {
      addUserMessage("Create an ad for a mango flavored protein powder highlighting its freshness");

      await new Promise((resolve) => setTimeout(resolve, 500));
      addAgentProgress("Analyzing your request...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      addAgentOutput(
        "There seems to be few issues with the generated adds\n\n1. The ad creatives are not matching the brand tone\n2. The ad creatives need to be 9:16 aspect ratio for Instagram\n3. The ad creatives need to be themed around Diwali\n\nI'll go ahead fix these and make variants");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      addAgentOutput(
        "Great! Now I have fixed your ads and create 5 more variants",
        "image_generated",
        [
          "/image-1.png",
          "/image-2.png",
          "/image-3.png",
          "/image-4.png"
        ]
      );

      addAgentOutput(
        "What do you think about the ads? If you want to try different concept, edit or want more variants, drop your thoughts in the chat "
      );
    };

    // Start initialization
    initializePlayground();
  }, [addMessage, sessionId]);

  return (
    <div className={containerClassName}>
      {/* Sidebar */}
      <div
        className={sidebarClassName}
        style={{ willChange: "transform" }}
      >
        <div className="relative h-full">
          <ChatPanel />
        </div>
      </div>

      {/* Main canvas area */}
      <div 
        ref={canvasAreaWrapperRef}
        className="relative min-w-0 h-full z-30 transition-transform duration-300 ease-in-out"
        style={canvasStyles}
      >
        <CanvasArea />
        <CollapsedOverlay position="left" />
      </div>
    </div>
  );
} 