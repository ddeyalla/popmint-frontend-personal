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
            addMessage({
              type: "userInput",
              content: initialMessage.content,
              imageUrls: initialMessage.imageUrls
            });
            
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
              addMessage({ type: 'agentProgress', content: 'Processing your request...' });
              
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
        addMessage({
          type: 'agentOutput',
          content: `Error initializing playground: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
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
                
                if (data.type === 'agentProgress') {
                  addMessage({ type: 'agentProgress', content: data.content });
                } else if (data.type === 'agentOutput') {
                  const hasImages = data.imageUrls && data.imageUrls.length > 0;
                  
                  // Add the message to chat
                  addMessage({
                    type: 'agentOutput',
                    content: data.content,
                    imageUrls: hasImages ? data.imageUrls : undefined,
                    subType: hasImages ? 'image_generated' : undefined
                  });
                  
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
        addMessage({
          type: 'agentOutput',
          content: `Error: ${error.message || 'Failed to generate image'}`
        });
      } finally {
        // Always clean up when done, regardless of success/failure
        localStorage.removeItem("popmint-process-image");
      }
    };

    // Generate ads for product URLs
    const generateAd = async (content: string) => {
      try {
        // Add a progress message
        addMessage({ 
          type: 'agentProgress', 
          content: 'Starting ad generation...',
          subType: 'ad_concept'
        });

        // Check if content starts with /ad command and extract product URL
        let productUrl = '';
        let imageCount = 4; // Default count
        
        if (content.toLowerCase().startsWith('/ad')) {
          // Parse /ad command pattern
          const commandText = content.replace(/^\/ad\s+/i, '').trim();
          
          // Look for image count flag (e.g., --count=4 or -n=4)
          const countMatch = commandText.match(/(--count=|--n=|-n=)(\d+)$/);
          
          if (countMatch) {
            // Extract count and remove the flag from the URL
            imageCount = parseInt(countMatch[2], 10);
            productUrl = commandText.replace(countMatch[0], '').trim();
          } else {
            productUrl = commandText;
          }
        } else {
          // Try to extract URL from regular text
          const urlMatch = content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
          if (urlMatch && urlMatch.length > 0) {
            productUrl = urlMatch[0];
          }
        }

        if (!productUrl) {
          addMessage({
            type: 'agentOutput',
            content: 'No valid product URL found. Please provide a URL to generate ads.',
            subType: 'ad_concept'
          });
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
          addMessage({
            type: 'agentOutput',
            content: `Ad generation service is unavailable. Please try again later.`,
            subType: 'ad_concept'
          });
          return;
        }

        // Generate ad using adGenerationService from generate-ad.ts
        addMessage({ 
          type: 'agentProgress', 
          content: `Analyzing product from URL: ${productUrl}`,
          subType: 'ad_concept'
        });
        
        // Import the ad generation functions
        const { generateAdsFromProductUrl, getAdGenerationStreamUrl } = await import('@/lib/generate-ad');
        
        // Start the generation job
        const jobId = await generateAdsFromProductUrl(productUrl, imageCount);
        console.log(`[Playground] Ad generation job started with ID: ${jobId}`);
        
        // Connect to the SSE stream
        addMessage({ 
          type: 'agentProgress', 
          content: `Ad generation started. Will create ${imageCount} image${imageCount !== 1 ? 's' : ''}.`,
          subType: 'ad_concept'
        });
        
        // Get the stream URL
        const streamUrl = getAdGenerationStreamUrl(jobId);
        console.log(`[Playground] Connecting to stream URL: ${streamUrl}`);
        
        // Connect to the stream using EventSource directly
        const eventSource = new EventSource(streamUrl);
        
        // Map to track if we've already processed certain stages
        const processedStages = new Map<string, boolean>();
        
        // Generic message handler for unnamed events
        eventSource.onmessage = (event) => {
          try {
            console.log('[Playground] Received generic SSE message:', event.data);
            const data = JSON.parse(event.data);
            
            if (data.stage) {
              // Show progress message if not already shown for this stage
              const stageKey = data.stage;
              if (!processedStages.get(stageKey)) {
                processedStages.set(stageKey, true);
                
                const progressMessage = data.message || `Processing stage: ${data.stage}`;
                addMessage({
                  type: 'agentProgress',
                  content: progressMessage,
                  subType: 'ad_concept'
                });
              }
            }
            
            // Handle completion or error
            if (data.stage === 'done' || data.stage === 'error') {
              if (data.stage === 'done' && data.data?.imageUrls) {
                console.log('[Playground] Ad generation complete with images:', data.data.imageUrls);
                // Add the images to the canvas
                addImagesToCanvas(data.data.imageUrls);
                
                // Add completion message
                addMessage({
                  type: 'agentOutput',
                  content: data.message || 'Ad generation complete!',
                  subType: 'ad_concept'
                });
              } else if (data.stage === 'error') {
                console.error('[Playground] Ad generation error:', data);
                addMessage({
                  type: 'agentOutput',
                  content: `Error: ${data.message || 'Unknown error during ad generation'}`,
                  subType: 'ad_concept'
                });
              }
              
              // Close the connection
              eventSource.close();
            }
          } catch (e) {
            console.error('[Playground] Error parsing message event:', e);
          }
        };
        
        // Set up specific event listeners for each stage in the ad generation pipeline
        const stageHandlers: Record<string, (data: any) => void> = {
          'plan': (data) => {
            console.log('[Playground] Plan stage:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Planning ad generation...',
              subType: 'ad_concept'
            });
          },
          'page_scrape_started': (data) => {
            console.log('[Playground] Page scrape started:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Scraping product page...',
              subType: 'ad_concept'
            });
          },
          'page_scrape_done': (data) => {
            console.log('[Playground] Page scrape done:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Product page scraped successfully.',
              subType: 'ad_concept'
            });
          },
          'image_extraction_started': (data) => {
            console.log('[Playground] Image extraction started:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Extracting product images...',
              subType: 'ad_concept'
            });
          },
          'image_extraction_done': (data) => {
            console.log('[Playground] Image extraction done:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Product images extracted successfully.',
              subType: 'ad_concept'
            });
          },
          'research_started': (data) => {
            console.log('[Playground] Research started:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Researching product and market...',
              subType: 'ad_concept'
            });
          },
          'research_done': (data) => {
            console.log('[Playground] Research done:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Product research completed.',
              subType: 'ad_concept'
            });
          },
          'concepts_started': (data) => {
            console.log('[Playground] Concepts started:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Generating ad concepts...',
              subType: 'ad_concept'
            });
          },
          'concepts_done': (data) => {
            console.log('[Playground] Concepts done:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Ad concepts generated.',
              subType: 'ad_concept'
            });
            
            // If we have concept data, show it
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
          },
          'ideas_started': (data) => {
            console.log('[Playground] Ideas started:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Generating ad copy and ideas...',
              subType: 'ad_concept'
            });
          },
          'ideas_done': (data) => {
            console.log('[Playground] Ideas done:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Ad copy and ideas generated.',
              subType: 'ad_concept'
            });
          },
          'images_started': (data) => {
            console.log('[Playground] Images started:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Generating ad images...',
              subType: 'ad_concept'
            });
          },
          'image_generation_progress': (data) => {
            console.log('[Playground] Image generation progress:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || `Generating image ${data.data?.currentImage || ''}... ${data.pct || 0}% complete`,
              subType: 'ad_concept'
            });
          },
          'images_done': (data) => {
            console.log('[Playground] Images done:', data);
            addMessage({
              type: 'agentProgress',
              content: data.message || 'Ad images generated.',
              subType: 'ad_concept'
            });
          },
          'done': (data) => {
            console.log('[Playground] Generation done:', data);
            if (data.data?.imageUrls) {
              addMessage({
                type: 'agentOutput',
                content: data.message || 'Ad generation complete!',
                subType: 'ad_concept'
              });
              
              // Add images to canvas
              addImagesToCanvas(data.data.imageUrls);
            }
            eventSource.close();
          },
          'error': (data) => {
            console.error('[Playground] Error event:', data);
            addMessage({
              type: 'agentOutput',
              content: `Error: ${data.message || 'Unknown error'} (${data.errorCode || 'UNKNOWN_ERROR'})`,
              subType: 'ad_concept'
            });
            eventSource.close();
          },
          'heartbeat': (data) => {
            // Just log heartbeats, don't show in UI
            console.log('[Playground] Heartbeat received:', data);
          }
        };
        
        // Register all event handlers
        Object.entries(stageHandlers).forEach(([event, handler]) => {
          eventSource.addEventListener(event, (evt: any) => {
            try {
              const data = JSON.parse(evt.data);
              handler(data);
            } catch (e) {
              console.error(`[Playground] Error handling ${event} event:`, e);
            }
          });
        });
        
        // Handle connection error
        eventSource.onerror = (error) => {
          console.error('[Playground] EventSource error:', error);
          addMessage({
            type: 'agentOutput',
            content: 'Error connecting to ad generation service. Please try again.',
            subType: 'ad_concept'
          });
          eventSource.close();
        };
        
      } catch (error: any) {
        console.error('[Playground] Error with ad generation:', error);
        addMessage({
          type: 'agentOutput',
          content: `Error: ${error.message || 'An error occurred during ad generation'}`,
          subType: 'ad_concept'
        });
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
      addMessage({
        type: "userInput",
        content: "Create an ad for a mango flavored protein powder highlighting its freshness",
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      addMessage({ type: "agentProgress", content: "Analyzing your request..." });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      addMessage({
        type: "agentOutput",
        content:
          "There seems to be few issues with the generated adds\n\n1. The ad creatives are not matching the brand tone\n2. The ad creatives need to be 9:16 aspect ratio for Instagram\n3. The ad creatives need to be themed around Diwali\n\nI'll go ahead fix these and make variants",
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      addMessage({
        type: "agentOutput",
        subType: "image_generated",
        content: "Great! Now I have fixed your ads and create 5 more variants",
        imageUrls: [
          "/image-1.png",
          "/image-2.png",
          "/image-3.png",
          "/image-4.png"
        ],
      });

      addMessage({
        type: "agentOutput",
        content:
          "What do you think about the ads? If you want to try different concept, edit or want more variants, drop your thoughts in the chat ",
      });
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