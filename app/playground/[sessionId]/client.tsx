"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel";
import { CanvasArea } from "@/components/playground/canvas/canvas-area";
import { useChatStore } from "@/store/chatStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useSessionStore } from "@/store/sessionStore";
import { CollapsedOverlay } from "@/components/playground/collapsed-overlay";
import { cn } from "@/lib/utils";
import { generateAdsFromProductUrl } from "@/lib/generate-ad";
import { useProductPageSSE } from "@/components/playground/chat-panel/sse/product-page-handler";

interface ClientSidePlaygroundProps {
  sessionId: string;
}

export default function ClientSidePlayground({ sessionId }: ClientSidePlaygroundProps) {
  const { addMessage, startAdGeneration } = useChatStore();
  // We use useSessionStore.getState() directly when needed
  const isInitialized = useRef(false);
  const isSidebarCollapsed = useCanvasStore((state) => state.isSidebarCollapsed);
  const [isUILoading, setIsUILoading] = useState(true);
  const canvasAreaWrapperRef = useRef<HTMLDivElement>(null);

  // Use our new SSE handler
  const { connectToSSE, disconnectSSE } = useProductPageSSE();

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
      isSidebarCollapsed ? "p-0" : "p-0" // Remove padding to allow full expansion
    );
  }, [isSidebarCollapsed]);

  const sidebarClassName = useMemo(() => {
    return cn(
      "fixed left-0 top-0 h-full w-[372px] bg-white z-40 transition-transform duration-300 ease-in-out",
      isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (canvasAreaWrapperRef.current) {
      canvasAreaWrapperRef.current.offsetWidth;
      const resizeEvent = new CustomEvent('canvas-resize', { detail: { collapsed: isSidebarCollapsed } });
      window.dispatchEvent(resizeEvent);
    }
  }, [isSidebarCollapsed]);

  // Handle ad generation
  const handleAdGeneration = async (content: string, productUrl: string) => {
    try {
      console.log("[Playground] Starting ad generation for URL:", productUrl);

      // Validate the product URL
      if (!productUrl || !productUrl.match(/(https?:\/\/|www\.)[^\s\n\r]+/)) {
        console.error("[Playground] Invalid product URL:", productUrl);
        addMessage({
          role: 'assistant',
          type: 'error',
          content: 'Invalid product URL. Please provide a valid URL to generate ads.',
        });
        return;
      }

      // Generate a client-side job ID for tracking
      const clientJobId = `ad_${Date.now()}`;
      console.log("[Playground] Generated client job ID:", clientJobId);

      // Start ad generation in the store
      console.log("[Playground] Starting ad generation in store");
      startAdGeneration(clientJobId, content);

      // Add a temporary message
      console.log("[Playground] Adding temporary message");
      addMessage({
        role: 'assistant',
        type: 'temporary_status',
        content: "Got it! Let me take a look at that product and generate some ads for you...",
        icon: 'Loader2',
        isTemporary: true
      });

      // Call the API to start ad generation
      console.log("[Playground] Calling generateAdsFromProductUrl with URL:", productUrl);
      try {
        const serverJobId = await generateAdsFromProductUrl(clientJobId, productUrl);
        console.log("[Playground] Received server job ID:", serverJobId);

        // Map the server job ID to the current project name
        const currentProjectName = useSessionStore.getState().projectName;
        console.log(`[Playground] Mapping server job ID ${serverJobId} to project "${currentProjectName}"`);

        // Store the mapping and verify it was stored correctly
        useSessionStore.getState().mapJobIdToProject(serverJobId, currentProjectName);

        // Verify the mapping was stored correctly
        const storedProjectName = useSessionStore.getState().getProjectNameByJobId(serverJobId);
        console.log(`[Playground] Verified mapping: ${serverJobId} -> "${storedProjectName}"`);

        // If verification fails, try again
        if (storedProjectName !== currentProjectName) {
          console.log(`[Playground] Mapping verification failed, trying again`);
          useSessionStore.getState().mapJobIdToProject(serverJobId, currentProjectName);
        }

        // Connect to SSE stream using the server-generated job ID
        console.log("[Playground] Connecting to SSE stream with job ID:", serverJobId);
        connectToSSE(serverJobId);
      } catch (apiError) {
        console.error("[Playground] API call error:", apiError);
        throw apiError; // Re-throw to be caught by the outer try/catch
      }

    } catch (error) {
      console.error("[Playground] Error generating ads:", error);

      // Add error message
      addMessage({
        role: 'assistant',
        type: 'error',
        content: 'Failed to start ad generation. Please try again.',
      });
    }
  };

  // Initialize playground and handle initial messages
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializePlayground = async () => {
      try {
        console.log("[Playground] Initializing playground with sessionId:", sessionId);

        // Store the sessionId in the session store
        useSessionStore.getState().setSessionId(sessionId);

        // IMPORTANT: We need to read localStorage values BEFORE any async operations
        // to ensure we capture the values set by the homepage
        const initialMessageJson = localStorage.getItem("popmint-initial-message");
        const shouldGenerateAdStr = localStorage.getItem("popmint-generate-ad");
        const storedProductUrl = localStorage.getItem("popmint-product-url");
        const shouldProcessImageStr = localStorage.getItem("popmint-process-image");
        const promptToProcess = localStorage.getItem("popmint-prompt-to-process");

        // Log the values immediately to debug
        console.log("[Playground] Initial localStorage values:", {
          initialMessageJson: initialMessageJson ? "exists" : "missing",
          shouldGenerateAdStr,
          storedProductUrl,
          shouldProcessImageStr,
          promptToProcess: promptToProcess ? "exists" : "missing"
        });

        // Parse the flags - IMPORTANT: Default to true if URL is present but flag is missing
        let shouldGenerateAd = shouldGenerateAdStr === "true";
        let shouldProcessImage = shouldProcessImageStr === "true";

        // If we have a product URL but no generation flag, set it to true
        // This handles cases where the flag wasn't properly set
        if (storedProductUrl && !shouldGenerateAd && !shouldProcessImage) {
          console.log("[Playground] Found URL but no generation flags, enabling ad generation");
          shouldGenerateAd = true;
        }

        // Force a small delay before UI operations
        // This helps with race conditions in some browsers
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize chat UI with initial message
        if (initialMessageJson) {
          try {
            const initialMessage = JSON.parse(initialMessageJson);

            // Add the user's message to the chat
            addMessage({
              type: "text",
              role: "user",
              content: initialMessage.content,
              ...(initialMessage.imageUrls ? { imageUrls: initialMessage.imageUrls } : {})
            });

            // Clear the stored message
            localStorage.removeItem("popmint-initial-message");

            // UI is ready now
            setIsUILoading(false);

            // Handle ad generation if flag is set
            if (shouldGenerateAd) {
              console.log("[Playground] Ad generation flag is set, processing URL");

              // First check if we have a stored product URL from the homepage
              let productUrl = storedProductUrl;
              console.log("[Playground] Stored product URL:", productUrl);

              // If no stored URL, try to extract it from the message content
              if (!productUrl && initialMessage.content) {
                console.log("[Playground] No stored URL, attempting to extract from content:", initialMessage.content);
                const urlMatch = initialMessage.content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
                console.log("[Playground] URL match result:", urlMatch);

                if (urlMatch && urlMatch.length > 0) {
                  productUrl = urlMatch[0];
                  console.log("[Playground] Extracted URL:", productUrl);

                  if (productUrl && !productUrl.startsWith('http')) {
                    productUrl = 'https://' + productUrl;
                    console.log("[Playground] Added https:// prefix:", productUrl);
                  }
                }
              }

              // If we have a product URL, start ad generation
              if (productUrl) {
                console.log("[Playground] Starting ad generation with URL:", productUrl);

                // IMPORTANT: Don't use setTimeout here as it can cause race conditions
                // Instead, start ad generation immediately
                try {
                  // Handle ad generation directly
                  const content = initialMessage.content || promptToProcess || productUrl;
                  console.log("[Playground] Calling handleAdGeneration with content:", content);
                  handleAdGeneration(content, productUrl);
                } catch (adGenError) {
                  console.error("[Playground] Error in handleAdGeneration:", adGenError);
                }
              } else {
                console.error("[Playground] Ad generation flag set but no product URL found");
              }
            }
            // Handle image processing if flag is set (from debug route)
            else if (shouldProcessImage && promptToProcess) {
              console.log("[Playground] Image processing flag is set, processing prompt:", promptToProcess);

              // Extract URL if present in the prompt
              let productUrl: string | null = null;
              const urlMatch = promptToProcess.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);

              if (urlMatch && urlMatch.length > 0) {
                productUrl = urlMatch[0];
                if (productUrl && !productUrl.startsWith('http')) {
                  productUrl = 'https://' + productUrl;
                }
                console.log("[Playground] Extracted URL from prompt:", productUrl);

                // IMPORTANT: Don't use setTimeout here as it can cause race conditions
                // Instead, start ad generation immediately
                try {
                  // Handle ad generation with the extracted URL
                  if (productUrl && promptToProcess) {
                    console.log("[Playground] Calling handleAdGeneration with prompt:", promptToProcess);
                    handleAdGeneration(promptToProcess, productUrl);
                  }
                } catch (adGenError) {
                  console.error("[Playground] Error in handleAdGeneration:", adGenError);
                }
              } else {
                console.error("[Playground] No URL found in prompt to process");
              }
            }
          } catch (error) {
            console.error("[Playground] Error parsing initialMessageJson:", error);
            setIsUILoading(false);
          }
        } else {
          // No initial message, show empty UI
          setIsUILoading(false);
        }

        // Clear localStorage flags
        localStorage.removeItem("popmint-generate-ad");
        localStorage.removeItem("popmint-product-url");
        localStorage.removeItem("popmint-process-image");
        localStorage.removeItem("popmint-prompt-to-process");
      } catch (error) {
        console.error("[Playground] Error during initialization:", error);
        setIsUILoading(false);
      }
    };

    initializePlayground();

    // Clean up SSE connection on unmount
    return () => {
      disconnectSSE();
    };
  }, [addMessage, sessionId, startAdGeneration, connectToSSE, disconnectSSE]);

  if (isUILoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

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
        className="relative min-w-0 h-full w-full z-30 transition-transform duration-300 ease-in-out"
        style={{
          ...canvasStyles,
          padding: 0, // Ensure no padding
          margin: 0, // Ensure no margin
        }}
      >
        <CanvasArea />
        <CollapsedOverlay position="left" />
      </div>
    </div>
  );
}