import React from 'react';
import { AIInputWithSearch } from '@/components/ui/ai-input-with-search';
import { useAdGeneration } from './useAdGeneration';
import { useEventListeners } from './useEventListeners';
import { useCancelHandler } from './useCancelHandler';

interface ChatInputProps {
  disabled?: boolean;
}

/**
 * ChatInput component for handling user input and ad generation
 */
export const ChatInputComponent = ({ disabled: propDisabled = false }: ChatInputProps) => {
  // Use the ad generation hook
  const {
    inputValue,
    setInputValue,
    isProcessing,
    setIsProcessing,
    hasValidUrl,
    handleAdGeneration,
    handleSubmit,
    currentJobId,
    disconnectSSE
  } = useAdGeneration();

  // Use the event listeners hook
  useEventListeners(handleAdGeneration);

  // Use the cancel handler hook
  const { handleCancel } = useCancelHandler(currentJobId, disconnectSSE, setIsProcessing);

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
