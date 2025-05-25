import { useCallback } from "react";
import { useChatStore } from "@/store/chatStore";
import { messageQueue } from "@/lib/message-queue";
import { mapBackendStage, getStageDisplayName } from "../utils/stage-utils";
import { getAutoPersistenceStatus } from "@/lib/auto-persistence";

/**
 * Modern SSE Event Handler with Message Queue Integration
 * Ensures sequential, professional message display
 */
export function useModernSSEEventHandler() {
  // Track processed events to prevent duplicates
  const processedEvents = new Set<string>();

  const handleSSEEvent = useCallback((eventData: any) => {
    try {
      console.log('[ModernSSE] Processing event:', JSON.stringify(eventData, null, 2));

      // Check persistence status
      try {
        const status = getAutoPersistenceStatus();
        if (!status.isActive) {
          console.warn('[ModernSSE] Auto-persistence not ready, but processing event');
        }
      } catch (error) {
        console.warn('[ModernSSE] Auto-persistence not available');
      }

      // Extract event data
      const { stage, jobId, data, pct, message, errorCode } = eventData;

      if (!stage || !jobId) {
        console.warn('[ModernSSE] Missing required event data:', { stage, jobId });
        return;
      }

      // Create unique event ID to prevent duplicates
      const eventId = `${jobId}-${stage}-${Date.now()}`;
      if (processedEvents.has(eventId)) {
        console.log('[ModernSSE] Duplicate event detected, skipping:', eventId);
        return;
      }
      processedEvents.add(eventId);

      console.log(`[ModernSSE] Processing: ${stage} for job ${jobId}`);

      // Get store actions
      const {
        addMessage,
        addAgentBubble,
        updateAgentBubble,
        completeAgentBubble,
        addImagesToChatAndCanvas
      } = useChatStore.getState();

      // Handle events with message queue for sequential display
      switch (stage) {
        case 'plan':
          // Create smart planning bubble
          const planMessage = {
            id: `plan-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_bubble' as const,
            content: 'Smart planning',
            timestamp: new Date(),
            icon: 'Sparkles',
            agentData: {
              type: 'plan' as const,
              title: 'Smart planning',
              icon: 'Sparkles',
              jobId,
              startTime: new Date(),
              sections: [],
              isCompleted: false
            }
          };

          // Add to queue with high priority
          messageQueue.enqueue(planMessage, 'high', 0);
          break;

        case 'page_scrape_started':
          // Create product analysis bubble
          const analysisMessage = {
            id: `analysis-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_bubble' as const,
            content: 'Analyzing Product Page',
            timestamp: new Date(),
            icon: 'FileSearch',
            agentData: {
              type: 'product_analysis' as const,
              title: 'Analyzing Product Page',
              icon: 'FileSearch',
              jobId,
              startTime: new Date(),
              sections: [],
              isCompleted: false
            }
          };

          messageQueue.enqueue(analysisMessage, 'normal', 300);
          break;

        case 'page_scrape_done':
          // Complete product analysis and add transition message
          const existingAnalysis = useChatStore.getState().messages.find(
            msg => msg.agentData?.type === 'product_analysis' && msg.agentData?.jobId === jobId
          );

          if (existingAnalysis) {
            // Update to completed
            updateAgentBubble(existingAnalysis.id, {
              isCompleted: true,
              endTime: new Date()
            });
          }

          // Add transition message
          const transitionMessage = {
            id: `transition-analysis-${jobId}`,
            role: 'assistant' as const,
            type: 'text' as const,
            content: `Product analysis complete! Now let's dive into market research.`,
            timestamp: new Date(),
            icon: 'PopMintLogo'
          };

          messageQueue.enqueue(transitionMessage, 'normal', 400);
          break;

        case 'research_started':
          // Create research bubble
          const researchMessage = {
            id: `research-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_bubble' as const,
            content: 'Market Research',
            timestamp: new Date(),
            icon: 'SearchCode',
            agentData: {
              type: 'research' as const,
              title: 'Market Research',
              icon: 'SearchCode',
              jobId,
              startTime: new Date(),
              sections: [],
              isCompleted: false
            }
          };

          messageQueue.enqueue(researchMessage, 'normal', 500);
          break;

        case 'research_done':
          // Complete research and add research output
          const existingResearch = useChatStore.getState().messages.find(
            msg => msg.agentData?.type === 'research' && msg.agentData?.jobId === jobId
          );

          if (existingResearch) {
            updateAgentBubble(existingResearch.id, {
              isCompleted: true,
              endTime: new Date()
            });
          }

          // Add research output message
          const researchOutputMessage = {
            id: `research-output-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_output' as const,
            content: data?.summary || 'Research insights gathered successfully.',
            timestamp: new Date(),
            icon: 'PopMintLogo'
          };

          messageQueue.enqueue(researchOutputMessage, 'normal', 600);
          break;

        case 'concepts_started':
          // Create creative strategy bubble
          const strategyMessage = {
            id: `strategy-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_bubble' as const,
            content: 'Creative Strategy',
            timestamp: new Date(),
            icon: 'Lightbulb',
            agentData: {
              type: 'creative_strategy' as const,
              title: 'Creative Strategy',
              icon: 'Lightbulb',
              jobId,
              startTime: new Date(),
              sections: [],
              isCompleted: false
            }
          };

          messageQueue.enqueue(strategyMessage, 'normal', 400);
          break;

        case 'concepts_done':
          // Complete strategy and add concepts
          const existingStrategy = useChatStore.getState().messages.find(
            msg => msg.agentData?.type === 'creative_strategy' && msg.agentData?.jobId === jobId
          );

          if (existingStrategy) {
            updateAgentBubble(existingStrategy.id, {
              isCompleted: true,
              endTime: new Date()
            });
          }

          // Add ad concepts message (will be split into individual bubbles by renderer)
          const conceptsMessage = {
            id: `concepts-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_output' as const,
            content: data?.concepts || JSON.stringify(data) || 'Ad concepts generated successfully.',
            timestamp: new Date(),
            icon: 'PopMintLogo'
          };

          messageQueue.enqueue(conceptsMessage, 'normal', 500);
          break;

        case 'images_started':
          // Create ad creation bubble
          const creationMessage = {
            id: `creation-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_bubble' as const,
            content: 'Generating Visuals',
            timestamp: new Date(),
            icon: 'ImagePlay',
            agentData: {
              type: 'ad_creation' as const,
              title: 'Generating Visuals',
              icon: 'ImagePlay',
              jobId,
              startTime: new Date(),
              sections: [],
              isCompleted: false
            }
          };

          messageQueue.enqueue(creationMessage, 'normal', 300);
          break;

        case 'images_done':
          // Complete ad creation and add final images
          const existingCreation = useChatStore.getState().messages.find(
            msg => msg.agentData?.type === 'ad_creation' && msg.agentData?.jobId === jobId
          );

          if (existingCreation) {
            updateAgentBubble(existingCreation.id, {
              isCompleted: true,
              endTime: new Date()
            });
          }

          // Add final output message with images
          const finalMessage = {
            id: `final-${jobId}`,
            role: 'assistant' as const,
            type: 'agent_output' as const,
            content: 'Your ad campaign is ready! Here are the generated visuals:',
            timestamp: new Date(),
            icon: 'PopMintLogo',
            imageUrls: data?.imageUrls || []
          };

          messageQueue.enqueue(finalMessage, 'normal', 400);

          // Add images to canvas if available
          if (data?.imageUrls && data.imageUrls.length > 0) {
            setTimeout(() => {
              addImagesToChatAndCanvas(finalMessage.id, data.imageUrls);
            }, 500);
          }
          break;

        case 'done':
          // Add completion message
          const completionMessage = {
            id: `completion-${jobId}`,
            role: 'assistant' as const,
            type: 'text' as const,
            content: "All done! Your ad campaign is ready to launch. Feel free to make any adjustments on the canvas.",
            timestamp: new Date(),
            icon: 'PopMintLogo'
          };

          messageQueue.enqueue(completionMessage, 'low', 600);
          break;

        case 'error':
          // Add error message
          const errorMessage = {
            id: `error-${jobId}`,
            role: 'assistant' as const,
            type: 'error' as const,
            content: message || errorCode || 'An unexpected error occurred. Please try again.',
            timestamp: new Date(),
            icon: 'AlertTriangle'
          };

          messageQueue.enqueue(errorMessage, 'high', 0);
          break;

        default:
          console.log(`[ModernSSE] Unhandled event type: ${stage}`);
          break;
      }

      // Clean up old processed events (keep last 100)
      if (processedEvents.size > 100) {
        const eventsArray = Array.from(processedEvents);
        eventsArray.slice(0, 50).forEach(id => processedEvents.delete(id));
      }

    } catch (error) {
      console.error('[ModernSSE] Error processing event:', error);
    }
  }, []);

  return { handleSSEEvent };
}
