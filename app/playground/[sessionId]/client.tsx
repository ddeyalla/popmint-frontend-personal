"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel";
import { CanvasArea } from "@/components/playground/canvas/canvas-area";
import { useChatStore } from "@/store/chatStore";
import { useCanvasStore } from "@/store/canvasStore";
import { CollapsedOverlay } from "@/components/playground/collapsed-overlay";
import { cn } from "@/lib/utils";
import { generateAdsFromProductUrl } from "@/lib/generate-ad";
import { useProductPageSSE } from "@/components/playground/chat-panel/sse/product-page-handler";

interface ClientSidePlaygroundProps {
  sessionId: string;
}

export default function ClientSidePlayground({ sessionId }: ClientSidePlaygroundProps) {
  const { addMessage, startAdGeneration } = useChatStore();
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
      isSidebarCollapsed ? "p-2" : "p-2"
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

      // Generate a client-side job ID for tracking
      const clientJobId = `ad_${Date.now()}`;

      // Start ad generation in the store
      startAdGeneration(clientJobId, content);

      // Add a temporary message
      addMessage({
        role: 'assistant',
        type: 'temporary_status',
        content: "Got it! Let me take a look at that for you...",
        icon: 'Loader2',
        isTemporary: true
      });

      // Call the API to start ad generation
      const serverJobId = await generateAdsFromProductUrl(clientJobId, productUrl);

      // Connect to SSE stream using the server-generated job ID
      connectToSSE(serverJobId);

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
        const initialMessageJson = localStorage.getItem("popmint-initial-message");
        const shouldGenerateAdStr = localStorage.getItem("popmint-generate-ad");

        const shouldGenerateAd = shouldGenerateAdStr === "true";

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
            if (shouldGenerateAd && initialMessage.content) {
              const urlMatch = initialMessage.content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
              if (urlMatch && urlMatch.length > 0) {
                let productUrl = urlMatch[0];
                if (!productUrl.startsWith('http')) {
                  productUrl = 'https://' + productUrl;
                }

                // Handle ad generation directly
                handleAdGeneration(initialMessage.content, productUrl);
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
        className="relative min-w-0 h-full z-30 transition-transform duration-300 ease-in-out"
        style={canvasStyles}
      >
        <CanvasArea />
        <CollapsedOverlay position="left" />
      </div>
    </div>
  );
}