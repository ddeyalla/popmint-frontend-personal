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
  const isInitialized = useRef(false);
  const isSidebarCollapsed = useCanvasStore((state) => state.isSidebarCollapsed);
  const [isUILoading, setIsUILoading] = useState(true);

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
        const promptToProcess = localStorage.getItem("popmint-prompt-to-process");

        // Parse values
        const shouldProcessImage = shouldProcessImageStr === "true";
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
            
            // Start image generation in background AFTER UI is loaded
            if (userPrompt && shouldProcessImage) {
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
    <div className="flex h-screen w-full overflow-hidden bg-[#FFFFFF] p-2 gap-2">
      {isUILoading && (
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