import { useChatStore } from "@/store/chatStore";
import { findAgentBubble } from "./bubble-handlers";

/**
 * Helper function to handle ad creation events
 */
export const handleAdCreationEvent = (
  jobId: string, 
  eventType: 'started' | 'progress' | 'completed', 
  data: any
) => {
  const { 
    addMessage, 
    addAgentBubble, 
    addAgentBubbleSection, 
    updateAgentBubbleSection, 
    completeAgentBubble 
  } = useChatStore.getState();

  // Find existing Ad Creation bubble or create a new one
  const existingBubble = findAgentBubble('ad_creation');

  if (eventType === 'started') {
    if (!existingBubble) {
      // Create a transition message first
      addMessage({
        role: 'assistant',
        type: 'text',
        content: "Love those ideas! Now for the visual magic – let's generate some eye-catching ad images.",
        icon: 'Bot'
      });

      // Create the Ad Creation bubble
      const bubbleId = addAgentBubble(
        'ad_creation',
        'Generating Ad Visuals',
        'ImagePlay',
        jobId,
        'bg-gradient-to-b from-green-50 to-white'
      );

      // Add progress section
      addAgentBubbleSection(bubbleId, {
        title: 'Image Generation',
        description: `Preparing to generate ${data?.total_images || 'multiple'} images...`,
        icon: 'ImageIcon',
        status: 'active'
      });

      return bubbleId;
    }
    return existingBubble.id;
  }
  else if (eventType === 'progress') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const imageSection = sections.find((s: any) => s.title === 'Image Generation');

      if (imageSection) {
        // Update the section description
        updateAgentBubbleSection(existingBubble.id, imageSection.id, {
          description: `Image ${data?.current_image || '?'} of ${data?.total_images || '?'} generated...`,
          data: data?.image_url ? [data.image_url] : undefined
        });
      }
    }
  }
  else if (eventType === 'completed') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const imageSection = sections.find((s: any) => s.title === 'Image Generation');

      if (imageSection) {
        // Update the section status
        updateAgentBubbleSection(existingBubble.id, imageSection.id, {
          status: 'completed',
          description: `All ${data?.total_images || 'requested'} images generated!`,
          data: data?.imageUrls || 'All images generated successfully!'
        });
      }

      // Complete the bubble
      completeAgentBubble(existingBubble.id);

      // Add output message
      addMessage({
        role: 'assistant',
        type: 'text',
        content: `Visuals are complete! Take a look at the generated ads.`,
        icon: 'Bot',
        imageUrls: data?.imageUrls || []
      });
    }
  }

  return existingBubble?.id;
};

/**
 * Helper function to handle completion event
 */
export const handleCompletionEvent = (_jobId: string, _data: any) => {
  const { addMessage } = useChatStore.getState();

  // Add final message
  addMessage({
    role: 'assistant',
    type: 'text',
    content: "And we're all done! From product page to finished ad creatives. I hope these hit the mark for you!",
    icon: 'Award'
  });
};

/**
 * Helper function to handle error event
 */
export const handleErrorEvent = (jobId: string, data: any, errorCode?: string) => {
  const { 
    addMessage, 
    updateAgentBubble, 
    updateAgentBubbleSection 
  } = useChatStore.getState();

  // Add error message
  addMessage({
    role: 'assistant',
    type: 'error',
    content: `Oh dear, looks like we hit a small bump in the road. Specifically: ${data?.message || errorCode || 'Unknown error'}. So sorry about that! Perhaps we can try that bit again?`,
    icon: 'Frown'
  });

  // Update any active bubbles to show error
  const messages = useChatStore.getState().messages;
  const activeBubbles = messages.filter(msg =>
    msg.type === 'agent_bubble' &&
    msg.agentData?.jobId === jobId &&
    !msg.agentData?.isCompleted
  );

  activeBubbles.forEach(bubble => {
    // Mark all active sections as error
    const sections = bubble.agentData?.sections || [];
    sections.forEach(section => {
      if (section.status === 'active') {
        updateAgentBubbleSection(bubble.id, section.id, {
          status: 'error'
        });
      }
    });

    // Mark the bubble as completed with error
    updateAgentBubble(bubble.id, {
      isCompleted: true,
      error: data?.message || errorCode || 'Unknown error'
    });
  });
};
