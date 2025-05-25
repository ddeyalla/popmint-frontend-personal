import { AgentBubbleType, useChatStore } from "@/store/chatStore";

/**
 * Helper function to find an agent bubble by type
 */
export const findAgentBubble = (type: AgentBubbleType): { id: string, agentData: any } | null => {
  const messages = useChatStore.getState().messages;
  const bubble = messages.find(msg =>
    msg.type === 'agent_bubble' &&
    msg.agentData?.type === type
  );

  return bubble ? { id: bubble.id, agentData: bubble.agentData } : null;
};

/**
 * Helper function to handle plan event
 */
export const handlePlanEvent = (jobId: string, _data: any) => {
  const {
    addAgentBubble,
    addAgentBubbleSection
  } = useChatStore.getState();

  // Removed temporary thinking message for cleaner UX

  // Create the Plan agent bubble - using "Smart planning" instead of "Our Ad Creation Plan"
  const bubbleId = addAgentBubble(
    'plan',
    'Smart planning',
    'Sparkles',
    jobId,
    'bg-gradient-to-b from-blue-50 to-white'
  );

  // Add sections to the bubble
  addAgentBubbleSection(bubbleId, {
    title: 'Deep research',
    description: "Dive into the product page, real reviews, and top performing competitor ads",
    icon: 'Brain',
    status: 'pending'
  });

  addAgentBubbleSection(bubbleId, {
    title: 'Shape Ad concepts',
    description: "Blend those insights with your brand voice to sketch 2–3 campaign angles",
    icon: 'Sparkles',
    status: 'pending'
  });

  addAgentBubbleSection(bubbleId, {
    title: 'Craft the ads',
    description: "Turn the concept you pick into fully finished static visuals + copy",
    icon: 'ImageIcon',
    status: 'pending'
  });

  return bubbleId;
};

/**
 * Helper function to handle product analysis events
 */
export const handleProductAnalysisEvent = (
  jobId: string,
  eventType: 'started' | 'completed' | 'image_started' | 'image_completed',
  data: any
) => {
  const {
    addMessage,
    addAgentBubble,
    addAgentBubbleSection,
    updateAgentBubbleSection,
    completeAgentBubble
  } = useChatStore.getState();

  // Find existing Product Analysis bubble or create a new one
  const existingBubble = findAgentBubble('product_analysis');

  if (eventType === 'started') {
    if (!existingBubble) {
      // Create a transition message first
      addMessage({
        role: 'assistant',
        type: 'text',
        content: "First up, let's analyze that product page thoroughly.",
        icon: 'PopMintLogo'
      });

      // Create the Product Analysis bubble
      const bubbleId = addAgentBubble(
        'product_analysis',
        'Analyzing Product Page',
        'FileSearch',
        jobId,
        'bg-gradient-to-b from-cyan-50 to-white'
      );

      // Add sections
      addAgentBubbleSection(bubbleId, {
        title: 'Page Content Scan',
        description: 'Reading page details, text, and structure.',
        icon: 'FileText',
        status: 'active'
      });

      addAgentBubbleSection(bubbleId, {
        title: 'Visual Asset Check',
        description: 'Looking for primary product images.',
        icon: 'ImageIcon',
        status: 'pending'
      });

      return bubbleId;
    }
    return existingBubble.id;
  }
  else if (eventType === 'completed') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const contentScanSection = sections.find((s: any) => s.title === 'Page Content Scan');

      if (contentScanSection) {
        // Update the section status
        updateAgentBubbleSection(existingBubble.id, contentScanSection.id, {
          status: 'completed',
          data: data?.summary || 'Product details captured!'
        });

        // Activate the next section
        const visualAssetSection = sections.find((s: any) => s.title === 'Visual Asset Check');
        if (visualAssetSection) {
          updateAgentBubbleSection(existingBubble.id, visualAssetSection.id, {
            status: 'active'
          });
        }
      }
    }
  }
  else if (eventType === 'image_started') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const visualAssetSection = sections.find((s: any) => s.title === 'Visual Asset Check');

      if (visualAssetSection) {
        updateAgentBubbleSection(existingBubble.id, visualAssetSection.id, {
          status: 'active'
        });
      }
    }
  }
  else if (eventType === 'image_completed') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const visualAssetSection = sections.find((s: any) => s.title === 'Visual Asset Check');

      if (visualAssetSection) {
        updateAgentBubbleSection(existingBubble.id, visualAssetSection.id, {
          status: 'completed',
          data: 'Images secured!'
        });
      }

      // Complete the bubble
      completeAgentBubble(existingBubble.id);

      // Add output message
      addMessage({
        role: 'assistant',
        type: 'text',
        content: `Product page analysis complete! Here's a quick look:\n\n${data?.summary || 'Product details extracted successfully.'}`,
        icon: 'PopMintLogo',
        imageUrls: data?.imageUrls || []
      });
    }
  }

  return existingBubble?.id;
};
