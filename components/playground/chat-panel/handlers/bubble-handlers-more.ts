import { useChatStore } from "@/store/chatStore";
import { findAgentBubble } from "./bubble-handlers";

/**
 * Helper function to handle research events
 */
export const handleResearchEvent = (jobId: string, eventType: 'started' | 'completed', data: any) => {
  const {
    addMessage,
    addAgentBubble,
    addAgentBubbleSection,
    updateAgentBubbleSection,
    completeAgentBubble
  } = useChatStore.getState();

  // Find existing Research bubble or create a new one
  const existingBubble = findAgentBubble('research');

  if (eventType === 'started') {
    if (!existingBubble) {
      // Create a transition message first
      addMessage({
        role: 'assistant',
        type: 'text',
        content: "Alright, got the product essentials. Now, let's zoom out and research the bigger picture – market trends and competitor moves!",
        icon: 'PopMintLogo'
      });

      // Create the Research bubble
      const bubbleId = addAgentBubble(
        'research',
        'Conducting Deep Research',
        'Library',
        jobId,
        'bg-gradient-to-b from-purple-50 to-white'
      );

      // Add sections
      addAgentBubbleSection(bubbleId, {
        title: 'Product & Brand Synthesis',
        description: 'Reviewing product info, reviews, brand voice...',
        icon: 'Atom',
        status: 'active'
      });

      addAgentBubbleSection(bubbleId, {
        title: 'Market Analysis',
        description: 'Listening to customer chatter, pain points, desires...',
        icon: 'Users',
        status: 'pending'
      });

      addAgentBubbleSection(bubbleId, {
        title: 'Competitor Teardown',
        description: 'Analyzing top-performing competitor ads, hooks, angles...',
        icon: 'Target',
        status: 'pending'
      });

      return bubbleId;
    }
    return existingBubble.id;
  }
  else if (eventType === 'completed') {
    if (existingBubble) {
      // Update all sections to completed
      const sections = existingBubble.agentData.sections;

      sections.forEach((section: any) => {
        updateAgentBubbleSection(existingBubble.id, section.id, {
          status: 'completed'
        });
      });

      // Complete the bubble
      completeAgentBubble(existingBubble.id);

      // Add output message
      addMessage({
        role: 'assistant',
        type: 'text',
        content: `Research phase wrapped up! This should give us a solid strategic base. Here's the full report:\n\n${data?.summary || 'Research completed successfully.'}`,
        icon: 'PopMintLogo'
      });
    }
  }

  return existingBubble?.id;
};

/**
 * Helper function to handle creative strategy events
 */
export const handleCreativeStrategyEvent = (
  jobId: string,
  eventType: 'concepts_started' | 'concepts_completed' | 'ideas_started' | 'ideas_completed',
  data: any
) => {
  const {
    addMessage,
    addAgentBubble,
    addAgentBubbleSection,
    updateAgentBubbleSection,
    completeAgentBubble
  } = useChatStore.getState();

  // Find existing Creative Strategy bubble or create a new one
  const existingBubble = findAgentBubble('creative_strategy');

  if (eventType === 'concepts_started') {
    if (!existingBubble) {
      // Create a transition message first
      addMessage({
        role: 'assistant',
        type: 'text',
        content: "Fantastic research! Now, let's get those creative juices flowing and brainstorm some ad concepts and compelling copy.",
        icon: 'PopMintLogo'
      });

      // Create the Creative Strategy bubble
      const bubbleId = addAgentBubble(
        'creative_strategy',
        'Crafting Ad Concepts & Copy',
        'Palette',
        jobId,
        'bg-gradient-to-b from-amber-50 to-white'
      );

      // Add sections
      addAgentBubbleSection(bubbleId, {
        title: 'Concept Generation',
        description: 'Developing unique campaign angles based on research.',
        icon: 'Lightbulb',
        status: 'active'
      });

      addAgentBubbleSection(bubbleId, {
        title: 'Copywriting',
        description: 'Writing engaging headlines, body text, and calls to action.',
        icon: 'FileEdit',
        status: 'pending'
      });

      return bubbleId;
    }
    return existingBubble.id;
  }
  else if (eventType === 'concepts_completed') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const conceptSection = sections.find((s: any) => s.title === 'Concept Generation');

      if (conceptSection) {
        // Update the section status
        updateAgentBubbleSection(existingBubble.id, conceptSection.id, {
          status: 'completed',
          data: data?.summary || 'Concepts outlined!'
        });
      }
    }
  }
  else if (eventType === 'ideas_started') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const copySection = sections.find((s: any) => s.title === 'Copywriting');

      if (copySection) {
        // Update the section status
        updateAgentBubbleSection(existingBubble.id, copySection.id, {
          status: 'active'
        });
      }
    }
  }
  else if (eventType === 'ideas_completed') {
    if (existingBubble) {
      // Find the section to update
      const sections = existingBubble.agentData.sections;
      const copySection = sections.find((s: any) => s.title === 'Copywriting');

      if (copySection) {
        // Update the section status
        updateAgentBubbleSection(existingBubble.id, copySection.id, {
          status: 'completed',
          data: data?.ideas ? JSON.stringify(data.ideas, null, 2) : 'Ad copy ready!'
        });
      }

      // Complete the bubble
      completeAgentBubble(existingBubble.id);

      // Add output message
      addMessage({
        role: 'assistant',
        type: 'text',
        content: `Ad copy is hot off the press! Here are a few different ideas we can work with:\n\n${data?.ideas ? JSON.stringify(data.ideas, null, 2) : 'Ad copy ideas generated successfully.'}`,
        icon: 'PopMintLogo'
      });
    }
  }

  return existingBubble?.id;
};
