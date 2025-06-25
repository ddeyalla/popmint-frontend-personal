import { useEffect } from 'react';

/**
 * Custom hook for setting up event listeners for ad generation
 * @param handleAdGeneration Function to handle ad generation
 * @returns void
 */
export function useEventListeners(
  handleAdGeneration: (content: string, productUrl?: string) => Promise<void>
) {
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
  }, [handleAdGeneration]);
}
