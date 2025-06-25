"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel";
import { CanvasArea } from "@/components/playground/canvas/canvas-area";
import { useChatStore } from "@/store/chatStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useSessionStore } from "@/store/sessionStore";
import { useProjectStore } from "@/store/projectStore";
import { CollapsedOverlay } from "@/components/playground/collapsed-overlay";
import { cn } from "@/lib/utils";
import { generateAdsFromProductUrl } from "@/lib/generate-ad";
import { useProductPageSSE } from "@/components/playground/chat-panel/sse/product-page-handler";

interface ClientSidePlaygroundProps {
  projectId: string;
}

export default function ClientSidePlayground({ projectId }: ClientSidePlaygroundProps) {
  console.log("[PlaygroundClient] 🚀 Component mounting with projectId:", projectId);

  const { addMessage, startAdGeneration } = useChatStore();
  const { hydrateProject, createProjectFromPrompt, currentProjectId, linkJobToProject } = useProjectStore();
  // We use useSessionStore.getState() directly when needed
  const isInitialized = useRef(false);
  const isSidebarCollapsed = useCanvasStore((state) => state.isSidebarCollapsed);
  const [isUILoading, setIsUILoading] = useState(true);
  const [isPersistenceReady, setIsPersistenceReady] = useState(false);
  const canvasAreaWrapperRef = useRef<HTMLDivElement>(null);

  // Use our new SSE handler
  const { connectToSSE, disconnectSSE } = useProductPageSSE();

  // Test persistence function for debugging
  const testPersistence = async () => {
    try {
      console.log('[Playground] 🧪 Testing persistence manually...');

      // First, run a health check
      const { getAutoPersistenceStatus } = await import('@/lib/auto-persistence');
      const status = getAutoPersistenceStatus();
      console.log('[Playground] Auto-persistence status:', status);

      // Test chat message persistence
      const chatStore = useChatStore.getState();
      const messages = chatStore.messages;
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        console.log('[Playground] Testing chat persistence with message:', lastMessage.id);

        const { saveChatMessage } = await import('@/lib/chat-persistence');
        const savedMessage = await saveChatMessage(projectId, lastMessage);
        console.log('[Playground] Chat persistence test result:', savedMessage ? 'SUCCESS' : 'FAILED');
      } else {
        console.log('[Playground] No chat messages to test persistence with');
      }

      // Test canvas object persistence
      const canvasStore = useCanvasStore.getState();
      const objects = canvasStore.objects;
      if (objects.length > 0) {
        const lastObject = objects[objects.length - 1];
        console.log('[Playground] Testing canvas persistence with object:', lastObject.id);

        const { saveCanvasObject } = await import('@/lib/canvas-persistence');
        const savedObject = await saveCanvasObject(projectId, lastObject);
        console.log('[Playground] Canvas persistence test result:', savedObject ? 'SUCCESS' : 'FAILED');
      } else {
        console.log('[Playground] No canvas objects to test persistence with');
      }
    } catch (error) {
      console.error('[Playground] Persistence test error:', error);
    }
  };

  // Initialize persistence for this project - CRITICAL: This must complete before any data operations
  useEffect(() => {
    const initializePersistence = async () => {
      try {
        console.log('[Playground] 🚀 PERSISTENCE-FIRST: Starting initialization for projectId:', projectId);

        // Reset persistence ready state
        setIsPersistenceReady(false);

        // STEP 1: Hydrate the project and ensure persistence is ready
        console.log('[Playground] 🔧 PERSISTENCE-FIRST: Calling hydrateProject...');
        const success = await hydrateProject(projectId);

        if (success) {
          console.log('[Playground] ✅ PERSISTENCE-FIRST: Persistence initialized successfully');
          setIsPersistenceReady(true);
        } else {
          console.warn('[Playground] ⚠️ PERSISTENCE-FIRST: Persistence initialization failed, but continuing');
          // Still set ready to true to allow UI to show, but persistence won't work optimally
          setIsPersistenceReady(true);
        }
      } catch (error) {
        console.error('[Playground] 💥 PERSISTENCE-FIRST: Error initializing persistence:', error);
        // Still set ready to true to allow UI to show
        setIsPersistenceReady(true);
      }
    };

    // Only initialize if we have a valid project ID
    if (projectId && projectId.trim()) {
      initializePersistence();
    } else {
      console.error('[Playground] ❌ Invalid projectId provided:', projectId);
      setIsPersistenceReady(true); // Allow UI to show even with invalid ID
    }
  }, [projectId, hydrateProject]);

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

        // Link the job to the current project for persistence
        if (currentProjectId) {
          console.log(`[Playground] Linking job ${serverJobId} to project ${currentProjectId}`);
          try {
            await linkJobToProject(currentProjectId, serverJobId);
            console.log(`[Playground] Successfully linked job to project`);
          } catch (linkError) {
            console.error(`[Playground] Failed to link job to project:`, linkError);
            // Continue anyway - this is not critical for functionality
          }
        }

        // Map the server job ID to the current project name (legacy support)
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

  // Initialize playground - PERSISTENCE-FIRST APPROACH (NO localStorage dependencies)
  useEffect(() => {
    if (isInitialized.current) {
      // Already initialized, but check if we need to update UI loading state
      if (!isUILoading) return; // UI already loaded

      // PERSISTENCE-FIRST: Only show UI when persistence is ready
      if (isPersistenceReady) {
        console.log("[Playground] 🎉 PERSISTENCE-FIRST: Persistence ready, showing UI");
        setIsUILoading(false);
      } else {
        console.log("[Playground] ⏳ PERSISTENCE-FIRST: Waiting for persistence to be ready...");
      }
      return;
    }

    // Mark as initialized to prevent multiple initializations
    isInitialized.current = true;

    const initializePlayground = async () => {
      try {
        console.log("[Playground] PERSISTENCE-FIRST: Initializing playground with projectId:", projectId);

        // Store the projectId in the session store (for backward compatibility)
        useSessionStore.getState().setSessionId(projectId);

        console.log("[Playground] 🔧 PERSISTENCE-FIRST: Proceeding with initialization (persistence state:", isPersistenceReady, ")");

        // Check for localStorage data (for homepage navigation compatibility)
        // CRITICAL: Process localStorage IMMEDIATELY for homepage flow - don't wait for persistence
        const initialMessageJson = localStorage.getItem("popmint-initial-message");
        const shouldGenerateAdStr = localStorage.getItem("popmint-generate-ad");
        const storedProductUrl = localStorage.getItem("popmint-product-url");
        const shouldProcessImageStr = localStorage.getItem("popmint-process-image");
        const promptToProcess = localStorage.getItem("popmint-prompt-to-process");

        // Log the values for debugging
        console.log("[Playground] 📋 HOMEPAGE FLOW: localStorage values (checked immediately):", {
          initialMessageJson: initialMessageJson ? "exists" : "missing",
          initialMessageContent: initialMessageJson ? JSON.parse(initialMessageJson) : null,
          shouldGenerateAdStr,
          storedProductUrl,
          shouldProcessImageStr,
          promptToProcess: promptToProcess ? "exists" : "missing"
        });

        // HOMEPAGE FLOW: If we have localStorage data, process it immediately regardless of persistence state
        if (initialMessageJson) {
          console.log("[Playground] 🚀 HOMEPAGE FLOW: Processing localStorage data immediately (persistence state:", isPersistenceReady, ")");
        } else if (!isPersistenceReady) {
          // DIRECT URL ACCESS: Only wait for persistence if no localStorage data
          console.log("[Playground] ⏳ DIRECT URL ACCESS: No localStorage data, waiting for persistence...");
          return;
        } else {
          console.log("[Playground] ✅ DIRECT URL ACCESS: Persistence ready, proceeding...");
        }

        // Handle localStorage data if present (homepage navigation) OR wait for persistence (direct URL access)
        if (initialMessageJson) {
          // CRITICAL HOMEPAGE FLOW: Process localStorage data immediately - NEVER BLOCK THIS!
          try {
            const initialMessage = JSON.parse(initialMessageJson);
            console.log("[Playground] 🚀 CRITICAL HOMEPAGE FLOW: Processing localStorage message");

            // Add the user's message to the chat (will be auto-saved by persistence middleware)
            addMessage({
              type: "text",
              role: "user",
              content: initialMessage.content,
              ...(initialMessage.imageUrls ? { imageUrls: initialMessage.imageUrls } : {})
            });

            // Clear the stored message
            localStorage.removeItem("popmint-initial-message");

            // CRITICAL HOMEPAGE FLOW: Handle ad generation if requested
            const shouldGenerateAd = shouldGenerateAdStr === "true";
            const shouldProcessImage = shouldProcessImageStr === "true";

            if (shouldGenerateAd || shouldProcessImage) {
              console.log("[Playground] 🚀 CRITICAL HOMEPAGE FLOW: Ad generation requested");

              // Extract URL from stored data or message content
              let productUrl = storedProductUrl;
              if (!productUrl && initialMessage.content) {
                const urlMatch = initialMessage.content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
                if (urlMatch && urlMatch.length > 0) {
                  productUrl = urlMatch[0];
                  if (productUrl && !productUrl.startsWith('http')) {
                    productUrl = 'https://' + productUrl;
                  }
                }
              }

              if (productUrl) {
                console.log("[Playground] 🚀 CRITICAL HOMEPAGE FLOW: Starting ad generation with URL:", productUrl);
                try {
                  const content = initialMessage.content || promptToProcess || productUrl;
                  handleAdGeneration(content, productUrl);
                } catch (adGenError) {
                  console.error("[Playground] 💥 CRITICAL HOMEPAGE FLOW: Error in handleAdGeneration:", adGenError);
                }
              }
            }
          } catch (error) {
            console.error("[Playground] PERSISTENCE-FIRST: Error parsing initialMessageJson:", error);
          }

          // Clear localStorage flags (cleanup)
          localStorage.removeItem("popmint-generate-ad");
          localStorage.removeItem("popmint-product-url");
          localStorage.removeItem("popmint-process-image");
          localStorage.removeItem("popmint-prompt-to-process");

          // UI is ready now - show UI immediately for homepage flows
          console.log("[Playground] 🎉 HOMEPAGE FLOW: Initialization complete, showing UI");
          setIsUILoading(false);
        } else {
          // DIRECT URL ACCESS: Persistence is already ready (checked above), show UI
          console.log("[Playground] 🎉 DIRECT URL ACCESS: No localStorage data, persistence ready, showing UI");
          setIsUILoading(false);
        }

      } catch (error) {
        console.error("[Playground] PERSISTENCE-FIRST: Error during initialization:", error);
        setIsUILoading(false);
      }
    };

    initializePlayground();

    // Clean up SSE connection on unmount
    return () => {
      disconnectSSE();
    };
  }, [addMessage, projectId, startAdGeneration, connectToSSE, disconnectSSE, isPersistenceReady]);

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

      {/* Debug: Test Persistence Button */}
      <button
        onClick={testPersistence}
        className="fixed bottom-4 right-4 z-[9999] bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        title="Test persistence functionality"
      >
        🧪 Test Persistence
      </button>
    </div>
  );
}