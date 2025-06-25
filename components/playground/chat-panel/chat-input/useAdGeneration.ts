import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useChatStore } from '@/store/chatStore';
import { generateAdsFromProductUrl } from '@/lib/generate-ad';
import { useProductPageSSE } from '../sse/product-page-handler';
import { useUrlDetection } from './useUrlDetection';

/**
 * Custom hook for handling ad generation
 * @returns Object containing ad generation state and handlers
 */
export function useAdGeneration() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Use the URL detection hook
  const { hasValidUrl, extractUrl } = useUrlDetection(inputValue);
  
  // Use the shared SSE handler
  const { connectToSSE, disconnectSSE, currentJobId } = useProductPageSSE();

  const {
    addMessage,
    startAdGeneration,
  } = useChatStore();

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
        url = extractUrl(content);
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
  }, [isProcessing, startAdGeneration, connectToSSE, disconnectSSE, addMessage, extractUrl]);

  // Handle input submission
  const handleSubmit = useCallback((value: string) => {
    if (!value.trim()) return;

    handleAdGeneration(value);
    setInputValue('');
  }, [handleAdGeneration]);

  return {
    inputValue,
    setInputValue,
    isProcessing,
    setIsProcessing,
    hasValidUrl,
    handleAdGeneration,
    handleSubmit,
    currentJobId,
    disconnectSSE
  };
}
