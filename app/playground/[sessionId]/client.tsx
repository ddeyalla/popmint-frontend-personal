"use client";

import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel";
import { CanvasArea } from "@/components/playground/canvas/canvas-area";
import { useChatStore } from "@/store/chatStore";
import { useCanvasStore } from "@/store/canvasStore";

interface ClientSidePlaygroundProps {
  sessionId: string;
}

export default function ClientSidePlayground({ sessionId }: ClientSidePlaygroundProps) {
  const { addMessage } = useChatStore();
  const isLoaded = useRef(false); // Keep the ref to track if initialization has run
  const isSidebarCollapsed = useCanvasStore((state) => state.isSidebarCollapsed);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  useEffect(() => {
    // Guard to ensure this effect's core logic runs only once
    if (isLoaded.current) {
      console.log('[Playground] useEffect subsequent run: already initialized, skipping core logic.');
      return;
    }
    // Mark as loaded immediately to prevent re-execution of core logic
    isLoaded.current = true; 
    console.log('[Playground] useEffect first run: setting isLoaded.current to true.');

    console.log('[Playground] Initializing for sessionId:', sessionId);

    const initializePlayground = async () => {
      try {
        setIsLoading(true); // Set loading state to true at start
        console.log('[Playground] Attempting to read localStorage...');
        const initialMessageJson = localStorage.getItem("popmint-initial-message");
        const shouldProcessImageStr = localStorage.getItem("popmint-process-image");
        const promptToProcess = localStorage.getItem("popmint-prompt-to-process");

        console.log('[Playground] Raw localStorage - initialMessageJson:', initialMessageJson);
        console.log('[Playground] Raw localStorage - shouldProcessImageStr:', shouldProcessImageStr);
        console.log('[Playground] Raw localStorage - promptToProcess:', promptToProcess);

        const shouldProcessImage = shouldProcessImageStr === "true";
        let userPrompt = promptToProcess || ""; // Fallback to empty string if null
        
        // Log the exact values we'll be using for decision making
        console.log('[Playground] DECISION VALUES:');
        console.log(`[Playground] - shouldProcessImage: ${shouldProcessImage}`);
        console.log(`[Playground] - userPrompt: "${userPrompt}"`);
        console.log(`[Playground] - userPrompt is empty: ${!userPrompt || userPrompt.trim() === ''}`);
        console.log(`[Playground] - Will trigger image generation: ${shouldProcessImage && userPrompt && userPrompt.trim() !== ''}`);

        if (initialMessageJson) {
          try {
            const initialMessage = JSON.parse(initialMessageJson);
            console.log('[Playground] Parsed initialMessage:', initialMessage);
            addMessage({
              type: "userInput",
              content: initialMessage.content, // This should be the primary source of truth for the first user message content
              imageUrls: initialMessage.imageUrls
            });
            // If promptToProcess wasn't set (e.g. older logic or empty input), use content from initialMessage
            if (!userPrompt && initialMessage.content) {
              userPrompt = initialMessage.content;
            }
          } catch (error) {
            console.error("[Playground] Error parsing initialMessageJson:", error);
          }
        } else {
          console.log('[Playground] No initialMessageJson found in localStorage.');
        }

        console.log('[Playground] Resolved userPrompt for API call (if any):', userPrompt);
        console.log('[Playground] Resolved shouldProcessImage for API call:', shouldProcessImage);

        // If the prompt contains an image generation request, process it
        // This should be triggered for ALL homepage submissions
        if (userPrompt && shouldProcessImage) {
          console.log('[Playground] 🎬 STARTING IMAGE GENERATION PROCESS');
          console.log(`[Playground] 📝 Using prompt: "${userPrompt}"`);
          
          // Add a progress message to show the user something is happening
          addMessage({ type: 'agentProgress', content: 'Processing your request...' });
          
          try {
            // Make the API call to generate the image - similar to chat-input.tsx
            const response = await fetch('/api/agent/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: userPrompt }),
            });
            
            console.log('[Playground] API response status:', response.status);
            if (!response.ok) {
              const errorText = await response.text();
              console.error('[Playground] Server error:', response.status, errorText);
              throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const reader = response.body?.getReader();
            if (!reader) {
              console.error('[Playground] Could not read server response body.');
              throw new Error('Could not read server response body');
            }
            
            const decoder = new TextDecoder();
            let buffer = '';
            console.log('[Playground] Starting to process SSE stream...');
            
            // Process the SSE stream
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log('[Playground] ✅ SSE stream finished successfully.');
                // Clean up localStorage flags after successful processing
                localStorage.removeItem("popmint-process-image");
                break;
              }
              
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || ''; // Keep the last partial line in buffer
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    console.log('[Playground] Received SSE data event:', data);
                    
                    if (data.type === 'agentProgress') {
                      // Add progress message to chat
                      addMessage({ type: 'agentProgress', content: data.content });
                    } else if (data.type === 'agentOutput') {
                      // Add the subType 'image_generated' when the message contains images
                      const hasImages = data.imageUrls && data.imageUrls.length > 0;
                      
                      // Add the message to chat
                      addMessage({
                        type: 'agentOutput',
                        content: data.content,
                        imageUrls: hasImages ? data.imageUrls : undefined,
                        subType: hasImages ? 'image_generated' : undefined
                      });
                      
                      // If there are images, add them to the canvas
                      if (data.imageUrls && data.imageUrls.length > 0) {
                        console.log('[Playground] Agent output has images, adding to canvas:', data.imageUrls);
                        await Promise.all(data.imageUrls.map(async (url: string, i: number) => {
                          try {
                            // Always proxy external image URLs to avoid CORS issues
                            const isExternalUrl = url.startsWith('http') && !url.startsWith('/api/proxy-image');
                            const proxiedUrl = isExternalUrl 
                              ? `/api/proxy-image?url=${encodeURIComponent(url)}`
                              : url;
                              
                            console.log(`[Playground] Adding image ${i + 1} to canvas. Original:`, url);
                            console.log(`[Playground] Proxied URL (if applicable):`, proxiedUrl);

                            // Get canvas store
                            const canvasStore = useCanvasStore.getState();
                            
                            // Check if image already exists on canvas
                            const imageExists = canvasStore.objects.some(obj => {
                              if (!obj.src) return false;
                              
                              // Get the base URL without the proxy for comparison
                              const objIsProxied = obj.src.startsWith('/api/proxy-image');
                              const objOriginalUrl = objIsProxied 
                                ? decodeURIComponent(obj.src.split('?url=')[1] || '')
                                : obj.src;
                              
                              // Check if the original URL or proxied URL matches
                              return objOriginalUrl === url || obj.src === url || 
                                    objOriginalUrl === proxiedUrl || obj.src === proxiedUrl;
                            });
                            
                            if (!imageExists) {
                              // Add image to canvas
                              canvasStore.addImage(proxiedUrl, 20 + (i * 400), 20);
                              console.log(`[Playground] Image ${i + 1} added to canvas`);
                            } else {
                              console.log(`[Playground] Image ${i + 1} already exists on canvas, skipping`);
                            }
                          } catch (imgErr) {
                            console.error(`[Playground] Error adding image ${url} to canvas:`, imgErr);
                          }
                        }));
                      }
                    }
                  } catch (parseError) {
                    console.error('[Playground] Error parsing SSE data line:', line, parseError);
                  }
                }
              }
            }
          } catch (error: any) {
            console.error('[Playground] Error during image generation API call or SSE processing:', error);
            // Add error message to chat
            addMessage({
              type: 'agentOutput',
              content: `Error: ${error.message || 'Failed to generate image and process stream'}`
            });
          } finally {
            // Clean up localStorage flags regardless of success/failure
            localStorage.removeItem("popmint-process-image");
          }
        } else if (useChatStore.getState().messages.length === 0) {
          // Fallback to demo content if no initial message from localStorage and chat is empty
          console.log('[Playground] No actionable prompt from localStorage, and chat is empty. Showing demo content.');
          addMessage({
            type: "userInput",
            content: "Create an ad for a mango flavored protein powder highlighting its freshness",
          });

          await new Promise((resolve) => setTimeout(resolve, 1000));
          addMessage({ type: "agentProgress", content: "Analyzing your request..." });

          await new Promise((resolve) => setTimeout(resolve, 2000));
          addMessage({
            type: "agentOutput",
            content:
              "There seems to be few issues with the generated adds\n\n1. The ad creatives are not matching the brand tone\n2. The ad creatives need to be 9:16 aspect ratio for Instagram\n3. The ad creatives need to be themed around Diwali\n\nI'll go ahead fix these and make variants",
          });

          await new Promise((resolve) => setTimeout(resolve, 2000));
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

          await new Promise((resolve) => setTimeout(resolve, 1000));
          addMessage({
            type: "agentOutput",
            content:
              "What do you think about the ads? If you want to try different concept, edit or want more variants, drop your thoughts in the chat ",
          });
        }
      } catch (error) {
        console.error("[Playground] Unhandled error during initialization:", error);
        // Show error message to user
        addMessage({
          type: 'agentOutput',
          content: `Error initializing playground: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      } finally {
        setIsLoading(false); // Reset loading state
      }
    };

    initializePlayground().catch(error => {
      console.error("[Playground] Unhandled error during initializePlayground execution:", error);
      setIsLoading(false); // Ensure loading state is reset
    });
  }, [addMessage, sessionId]); // Removed 'isLoaded' from dependency array

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FFFFFF] p-2 gap-2">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-700">Loading playground...</p>
          </div>
        </div>
      )}
      {!isSidebarCollapsed && (
        <div className="w-1/4 min-w-[320px] max-w-[372px] h-full flex-shrink-0">
          <ChatPanel />
        </div>
      )}
      <div className="flex-1 w-full h-full">
        <CanvasArea />
      </div>
    </div>
  );
} 