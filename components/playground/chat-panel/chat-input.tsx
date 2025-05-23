import React, { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { useChatStore } from "@/store/chatStore";
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search";
import { generateAdsFromProductUrl, cancelAdGeneration } from "@/lib/generate-ad";
import { useProductPageSSE } from "./sse/product-page-handler";

interface ChatInputProps {
  disabled?: boolean;
}

const ChatInput = ({ disabled: propDisabled = false }: ChatInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasValidUrl, setHasValidUrl] = useState(false);

  // Use the shared SSE handler
  const { connectToSSE, disconnectSSE, currentJobId } = useProductPageSSE();

  const {
    addMessage,
    startAdGeneration,
    completeAdGeneration,
  } = useChatStore();

  // Listen for ad generation trigger from homepage
  useEffect(() => {
    const handleTriggerAdGeneration = (event: CustomEvent) => {
      const { content, productUrl } = event.detail;
      if (content && productUrl) {
        console.log('[ChatInput] Received trigger-ad-generation event with URL:', productUrl);
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

  // Handle ad generation
  const handleAdGeneration = useCallback(async (content: string, productUrl?: string) => {
    if (isProcessing) {
      toast.warning('Already processing a request');
      return;
    }

    try {
      setIsProcessing(true);

      // Extract URL from content if not provided
      let url = productUrl;
      if (!url) {
        const urlMatch = content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
        if (urlMatch && urlMatch.length > 0) {
          url = urlMatch[0];
          if (url.startsWith('www.')) {
            url = `https://${url}`;
          }
        }
      }

      if (!url) {
        toast.error('No valid URL found in your message');
        setIsProcessing(false);
        return;
      }

      // Make sure any previous connections are closed
      disconnectSSE();

      // Generate a client-side job ID for tracking
      const clientJobId = uuidv4();

      // Start ad generation in the store
      startAdGeneration(clientJobId, content);

      // Add user message
      addMessage({
        role: 'user',
        type: 'text',
        content: content
      });

      // Call the API to start ad generation first
      // This returns the server-generated job ID
      const serverJobId = await generateAdsFromProductUrl(clientJobId, url);

      // Then connect to SSE stream using the server-generated job ID
      connectToSSE(serverJobId);
    } catch (error) {
      console.error('Error generating ads:', error);

      // Add error message
      addMessage({
        role: 'assistant',
        type: 'error',
        content: 'Failed to start ad generation. Please try again.',
      });

      setIsProcessing(false);
      disconnectSSE();
    }
  }, [isProcessing, startAdGeneration, connectToSSE, disconnectSSE, addMessage]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    if (currentJobId) {
      try {
        console.log(`[SSE] Cancelling ad generation for job ID: ${currentJobId}`);
        await cancelAdGeneration(currentJobId);
        toast.info('Ad generation cancelled');
      } catch (error) {
        console.error('Error cancelling ad generation:', error);
      }
    }

    // Make sure to clean up all connections and timeouts
    disconnectSSE();

    // Reset processing state
    setIsProcessing(false);

    // Add a message to indicate cancellation
    addMessage({
      role: 'assistant',
      type: 'text',
      content: 'Ad generation was cancelled.',
      icon: 'XCircle'
    });
  }, [currentJobId, disconnectSSE, addMessage]);

  // Handle input submission
  const handleSubmit = useCallback((value: string) => {
    if (!value.trim()) return;

    handleAdGeneration(value);
    setInputValue("");
  }, [handleAdGeneration]);

  // Disabled state
  const disabled = propDisabled || isProcessing;

  return (
    <div className="relative">
      <AIInputWithSearch
        autoFocus
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSubmit}
        disabled={disabled}
        placeholder={disabled ? "Processing..." : "Enter a product URL to generate ads..."}
        showUrlDetection={hasValidUrl}
      />

      {isProcessing && (
        <div className="absolute right-2 top-2">
          <button
            onClick={handleCancel}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatInput;
