"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/playground/chat-panel/chat-panel";
import { CanvasArea } from "@/components/playground/canvas/canvas-area";
import { useChatStore } from "@/store/chatStore";
import { useCanvasStore } from "@/store/canvasStore";

interface ClientSidePlaygroundProps {
  sessionId: string;
}

export default function ClientSidePlayground({ sessionId }: ClientSidePlaygroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const addMessage = useChatStore((state) => state.addMessage);
  const isSidebarCollapsed = useCanvasStore((state) => state.isSidebarCollapsed);

  useEffect(() => {
    if (isLoaded) return;
    setIsLoaded(true);

    const initializeChat = async () => {
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
          "What do you think about the ads? If you want to try different concept, edit or want more variants, drop your thoughts in the chat 👇",
      });
    };

    if (useChatStore.getState().messages.length === 0) {
      initializeChat();
    }
  }, [addMessage, isLoaded, sessionId]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FFFFFF] p-2 gap-2">
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