"use client";

import React, { useState } from 'react';
import { ModernMessageRenderer } from '@/components/playground/chat-panel/ModernMessageRenderer';
import { ModernToggleBanner } from '@/components/playground/chat-panel/ModernToggleBanner';
import { ChatMessage } from '@/store/chatStore';
import { Button } from '@/components/ui/button';
import { messageQueue, enqueueMessage } from '@/lib/message-queue';

export default function TestModernChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize message queue
  React.useEffect(() => {
    if (!isInitialized) {
      messageQueue.initialize((message) => {
        setMessages(prev => [...prev, message]);
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Test message generators
  const addSmartPlanningBubble = () => {
    const message: ChatMessage = {
      id: `plan-${Date.now()}`,
      role: 'assistant',
      type: 'agent_bubble',
      content: 'Smart planning',
      timestamp: new Date(),
      icon: 'Sparkles',
      agentData: {
        type: 'plan',
        title: 'Smart planning',
        icon: 'Sparkles',
        jobId: 'test-job',
        startTime: new Date(),
        sections: [],
        isCompleted: false
      }
    };
    enqueueMessage(message, 'high');
  };

  const addResearchBubble = () => {
    const message: ChatMessage = {
      id: `research-${Date.now()}`,
      role: 'assistant',
      type: 'agent_bubble',
      content: 'Market Research',
      timestamp: new Date(),
      icon: 'SearchCode',
      agentData: {
        type: 'research',
        title: 'Market Research',
        icon: 'SearchCode',
        jobId: 'test-job',
        startTime: new Date(),
        sections: [],
        isCompleted: false
      }
    };
    enqueueMessage(message, 'normal', 500);
  };

  const addResearchOutput = () => {
    const message: ChatMessage = {
      id: `research-output-${Date.now()}`,
      role: 'assistant',
      type: 'agent_output',
      content: `Research insights for your product:

Target Audience: Young professionals aged 25-35 who value convenience and quality. They are tech-savvy, environmentally conscious, and willing to pay premium for products that save time and align with their values.

Market Trends: The market shows strong growth in sustainable products with 67% increase in eco-friendly purchases. Mobile commerce dominates with 78% of purchases happening on mobile devices.

Competitive Analysis: Main competitors focus on price competition, leaving opportunity for premium positioning based on quality and sustainability. Customer reviews emphasize the importance of fast shipping and excellent customer service.

Key Insights: Customers respond well to social proof, with 89% reading reviews before purchase. Video content performs 3x better than static images for product demonstrations.`,
      timestamp: new Date(),
      icon: 'PopMintLogo'
    };
    enqueueMessage(message, 'normal', 600);
  };

  const addAdConcepts = () => {
    const conceptsData = [
      {
        concept_name: "Premium Quality Focus",
        title: "Experience Premium Quality",
        headline: "Where Quality Meets Innovation",
        description: "Highlight the superior craftsmanship and attention to detail that sets your product apart.",
        cta: "Discover Quality"
      },
      {
        concept_name: "Eco-Friendly Appeal",
        title: "Sustainable Choice for Tomorrow",
        headline: "Good for You, Great for the Planet",
        description: "Emphasize environmental benefits and sustainable practices.",
        cta: "Go Green Today"
      },
      {
        concept_name: "Time-Saving Solution",
        title: "Save Time, Live More",
        headline: "More Time for What Matters",
        description: "Focus on convenience and time-saving benefits for busy professionals.",
        cta: "Save Time Now"
      }
    ];

    const message: ChatMessage = {
      id: `concepts-${Date.now()}`,
      role: 'assistant',
      type: 'agent_output',
      content: JSON.stringify(conceptsData),
      timestamp: new Date(),
      icon: 'PopMintLogo'
    };
    enqueueMessage(message, 'normal', 400);
  };

  const addFinalOutput = () => {
    const message: ChatMessage = {
      id: `final-${Date.now()}`,
      role: 'assistant',
      type: 'agent_output',
      content: 'Your ad campaign is ready! Here are the generated visuals:',
      timestamp: new Date(),
      icon: 'PopMintLogo',
      imageUrls: [
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=400&fit=crop'
      ]
    };
    enqueueMessage(message, 'normal', 300);
  };

  const clearMessages = () => {
    setMessages([]);
    messageQueue.clear();
  };

  const runFullSequence = () => {
    clearMessages();
    setTimeout(() => addSmartPlanningBubble(), 100);
    setTimeout(() => addResearchBubble(), 800);
    setTimeout(() => addResearchOutput(), 1500);
    setTimeout(() => addAdConcepts(), 2200);
    setTimeout(() => addFinalOutput(), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Modern Chat System Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test the new sequential, professional chat bubble system with proper timing and modern design.
          </p>
          
          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={addSmartPlanningBubble} variant="outline">
              Add Smart Planning
            </Button>
            <Button onClick={addResearchBubble} variant="outline">
              Add Research Bubble
            </Button>
            <Button onClick={addResearchOutput} variant="outline">
              Add Research Output
            </Button>
            <Button onClick={addAdConcepts} variant="outline">
              Add Ad Concepts
            </Button>
            <Button onClick={addFinalOutput} variant="outline">
              Add Final Output
            </Button>
            <Button onClick={runFullSequence} className="bg-blue-600 hover:bg-blue-700">
              Run Full Sequence
            </Button>
            <Button onClick={clearMessages} variant="destructive">
              Clear All
            </Button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-lg p-6 min-h-[600px]">
          {/* Toggle Banner */}
          <ModernToggleBanner />
          
          {/* Messages */}
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No messages yet. Click the buttons above to test the modern chat system.</p>
              </div>
            ) : (
              messages.map((message) => (
                <ModernMessageRenderer key={message.id} message={message} />
              ))
            )}
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">System Status</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <div>Messages: {messages.length}</div>
            <div>Queue Status: {isInitialized ? 'Initialized' : 'Not initialized'}</div>
            <div>Modern Renderer: Active</div>
            <div>Sequential Display: Enabled</div>
          </div>
        </div>
      </div>
    </div>
  );
}
