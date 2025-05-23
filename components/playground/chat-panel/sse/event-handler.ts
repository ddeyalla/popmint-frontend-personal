import { useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import {
  handlePlanEvent,
  handleProductAnalysisEvent,
  handleResearchEvent,
  handleCreativeStrategyEvent,
  handleAdCreationEvent,
  handleCompletionEvent,
  handleErrorEvent
} from "../handlers";
import { mapBackendStage, getStageDisplayName, stepStartTimes } from "../utils/stage-utils";

/**
 * Hook for handling SSE events
 */
export function useSSEEventHandler() {
  // Handle SSE events
  const handleSSEEvent = useCallback((eventData: any) => {
    try {
      // Check if eventData is defined and not empty
      if (!eventData) {
        console.warn('[SSE] Received undefined or null event data');
        return;
      }

      const { jobId, stage, message, data, pct = 0, errorCode } = eventData;

      // Validate required fields
      if (!jobId) {
        console.warn('[SSE] Event missing jobId:', eventData);
        return;
      }

      if (!stage) {
        console.warn('[SSE] Event missing stage:', eventData);
        return;
      }

      console.log(`[SSE] Processing event: ${stage} for job ${jobId}`, { data, pct, message, errorCode });

      const eventJobId = jobId as string;
      const mappedStage = mapBackendStage(stage);

      // Track step start times for legacy support
      const stepKey = `${eventJobId}-${stage}`;

      // For "*_started" events, record start time
      if (stage.endsWith('_started')) {
        stepStartTimes.set(stepKey, { stage, startTime: new Date() });
      }

      // Get store actions
      const {
        updateAdGeneration,
        completeAdGenerationStep,
        addGeneratedImage,
        setAdGenerationError,
        completeAdGeneration,
        addMessage
      } = useChatStore.getState();

      // Handle different event types with the new agent bubble approach
      switch (stage) {
        case 'plan':
          // Create the plan agent bubble
          handlePlanEvent(eventJobId, data);

          // Also update the legacy ad generation state for backward compatibility
          updateAdGeneration(eventJobId, 'planning', {
            progress: pct,
            message: message || 'Smart plan created',
          });
          break;

        case 'page_scrape_started':
          // Create or update the product analysis agent bubble
          handleProductAnalysisEvent(eventJobId, 'started', data);

          // Also update the legacy ad generation state for backward compatibility
          updateAdGeneration(eventJobId, 'scraping', {
            progress: pct,
            message: 'Checking your product details...',
          });
          break;

        case 'page_scrape_done':
          // Update the product analysis agent bubble
          handleProductAnalysisEvent(eventJobId, 'completed', data);

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'scraping',
            `✅ ${getStageDisplayName(stage)}`,
            data
          );
          break;

        case 'image_extraction_started':
          // Update the product analysis agent bubble
          handleProductAnalysisEvent(eventJobId, 'image_started', data);

          // Also update the legacy ad generation state for backward compatibility
          updateAdGeneration(eventJobId, 'scraping', {
            progress: pct,
            message: 'Extracting product images...',
          });
          break;

        case 'image_extraction_done':
          // Update the product analysis agent bubble
          handleProductAnalysisEvent(eventJobId, 'image_completed', data);

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'scraping',
            `✅ ${getStageDisplayName(stage)}`,
            data
          );
          break;

        case 'research_started':
          // Create or update the research agent bubble
          handleResearchEvent(eventJobId, 'started', data);

          // Also update the legacy ad generation state for backward compatibility
          updateAdGeneration(eventJobId, 'researching', {
            progress: pct,
            message: 'Researching your product...',
          });
          break;

        case 'research_done':
          // Update the research agent bubble
          handleResearchEvent(eventJobId, 'completed', data);

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'researching',
            `✅ ${getStageDisplayName(stage)}`,
            data
          );
          break;

        case 'concepts_started':
          // Create or update the creative strategy agent bubble
          handleCreativeStrategyEvent(eventJobId, 'concepts_started', data);

          // Also update the legacy ad generation state for backward compatibility
          updateAdGeneration(eventJobId, 'concepting', {
            progress: pct,
            message: 'Generating ad concepts...',
          });
          break;

        case 'concepts_done':
          // Update the creative strategy agent bubble
          handleCreativeStrategyEvent(eventJobId, 'concepts_completed', data);

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'concepting',
            `✅ ${getStageDisplayName(stage)}`,
            data
          );
          break;

        case 'ideas_started':
          // Update the creative strategy agent bubble
          handleCreativeStrategyEvent(eventJobId, 'ideas_started', data);

          // Also update the legacy ad generation state for backward compatibility
          updateAdGeneration(eventJobId, 'ideating', {
            progress: pct,
            message: 'Generating ad copy ideas...',
          });
          break;

        case 'ideas_done':
          // Update the creative strategy agent bubble
          handleCreativeStrategyEvent(eventJobId, 'ideas_completed', data);

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'ideating',
            `✅ ${getStageDisplayName(stage)}`,
            data
          );
          break;

        case 'images_started':
          // Create or update the ad creation agent bubble
          handleAdCreationEvent(eventJobId, 'started', data);

          // Also update the legacy ad generation state for backward compatibility
          updateAdGeneration(eventJobId, 'imaging', {
            progress: pct,
            message: message || 'Generating ads...',
          });
          break;

        case 'image_generation_progress':
          // Update the ad creation agent bubble
          handleAdCreationEvent(eventJobId, 'progress', data);

          // Create a message for the generated image if it doesn't exist yet
          if (data?.image_url) {
            // First, check if we already have a message for this job with images
            const messages = useChatStore.getState().messages;
            const existingImageMessage = messages.find(msg =>
              msg.type === 'agent_output' &&
              msg.role === 'assistant' &&
              msg.content.includes('generated')
            );

            if (existingImageMessage) {
              // Add this image to the existing message
              useChatStore.getState().addImageToChat(existingImageMessage.id, data.image_url, true);
            } else {
              // Create a new message for this image
              const messageId = addMessage({
                role: 'assistant',
                type: 'agent_output',
                content: `Generated image ${data?.current_image || 1} of ${data?.total_images || '?'}`,
                icon: 'ImageIcon'
              });

              // Add the image to both chat and canvas
              useChatStore.getState().addImageToChat(messageId, data.image_url, true);
            }

            // Also update the legacy ad generation state for backward compatibility
            addGeneratedImage(eventJobId, data.image_url);
          }

          updateAdGeneration(eventJobId, 'imaging', {
            progress: pct,
            message: data?.current_image && data?.total_images
              ? `Generating ad image ${data.current_image} of ${data.total_images}...`
              : 'Generating ads...',
          });
          break;

        case 'images_done':
          // Update the ad creation agent bubble
          handleAdCreationEvent(eventJobId, 'completed', data);

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'imaging',
            `✅ ${getStageDisplayName(stage)}`,
            data
          );
          break;

        case 'done':
          // Handle completion event
          handleCompletionEvent(eventJobId, data);

          // Create a final message with all images if they're not already displayed
          if (data?.imageUrls && data.imageUrls.length > 0) {
            // Check if we already have a message with all these images
            const messages = useChatStore.getState().messages;
            const existingImageMessage = messages.find(msg =>
              msg.type === 'agent_output' &&
              msg.imageUrls &&
              msg.imageUrls.length === data.imageUrls.length &&
              msg.imageUrls.every(url => data.imageUrls.includes(url))
            );

            if (!existingImageMessage) {
              // Create a new message with all images
              const messageId = addMessage({
                role: 'assistant',
                type: 'agent_output',
                content: `Here are all the generated ad images:`,
                icon: 'ImageIcon'
              });

              // Add all images to both chat and canvas
              useChatStore.getState().addImagesToChatAndCanvas(messageId, data.imageUrls);
            }
          }

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'completed',
            `🎉 All ads generated successfully!`,
            { finalImages: data?.imageUrls || [] }
          );
          completeAdGeneration(eventJobId, data?.imageUrls || []);
          break;

        case 'error':
          // Handle error event
          handleErrorEvent(eventJobId, data, errorCode);

          // Also update the legacy ad generation state for backward compatibility
          completeAdGenerationStep(
            eventJobId,
            'error',
            `❌ Error: ${message || 'Unknown error occurred'}`,
            { errorCode: errorCode }
          );
          setAdGenerationError(eventJobId, message || 'Unknown error occurred');
          break;

        case 'heartbeat':
          // Heartbeat events - no UI updates needed
          break;

        default:
          // For any other events, just update the legacy ad generation state
          updateAdGeneration(eventJobId, mappedStage, {
            progress: pct,
            message: message || `Processing ${stage}...`,
          });
          break;
      }
    } catch (error) {
      console.error('Error handling SSE event:', error, 'Event data:', eventData);

      // Don't crash the entire SSE handling on a single event error
      // Just log it and continue processing other events
      if (eventData?.jobId) {
        // If we have a job ID, we can try to add an error message to the UI
        // but only for critical errors to avoid spamming the user
        if (error instanceof TypeError || error instanceof ReferenceError) {
          console.warn('[SSE] Critical error in event handling, but continuing:', error.message);

          // Log the stack trace for debugging
          console.error('[SSE] Error stack:', error.stack);

          // Log the current state of the event data
          console.error('[SSE] Event data that caused the error:', JSON.stringify(eventData, null, 2));
        }
      }
    }
  }, []);

  return { handleSSEEvent };
}
