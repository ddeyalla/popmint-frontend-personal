import { useCallback } from 'react';
import { toast } from 'sonner';
import { useChatStore } from '@/store/chatStore';
import { cancelAdGeneration } from '@/lib/generate-ad';

/**
 * Custom hook for handling cancellation of ad generation
 * @param currentJobId The current job ID to cancel
 * @param disconnectSSE Function to disconnect SSE connection
 * @param setIsProcessing Function to update processing state
 * @returns Object containing the cancel handler function
 */
export function useCancelHandler(
  currentJobId: string | null,
  disconnectSSE: () => void,
  setIsProcessing: (isProcessing: boolean) => void
) {
  const addMessage = useChatStore(state => state.addMessage);

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
  }, [currentJobId, disconnectSSE, addMessage, setIsProcessing]);

  return { handleCancel };
}
