"use client";

import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageRenderer } from '@/components/playground/chat-panel/MessageRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollToBottom } from '@/components/ui/scroll-to-bottom';
import { ActiveTaskBanner } from '@/components/ui/active-task-banner';
import { playSFX } from '@/lib/playSFX';

export default function TestChatBubbles() {
  const { messages, addMessage, clearMessages } = useChatStore();
  const [showBanner, setShowBanner] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const addTestMessage = (type: string, content: string, extraProps = {}) => {
    addMessage({
      role: type.includes('user') ? 'user' : 'assistant',
      type: type as any,
      content,
      ...extraProps
    });
  };

  const testMessages = [
    {
      label: 'User Message',
      action: () => addTestMessage('text', 'Hello! I want to create ads for my product: https://example.com/product')
    },
    {
      label: 'AI Response',
      action: () => addTestMessage('text', 'Great! I\'ll help you create compelling ads for your product. Let me analyze the page first.')
    },
    {
      label: 'Temporary Status',
      action: () => addTestMessage('temporary_status', 'Scanning the product page...', { icon: 'Loader2' })
    },
    {
      label: 'Agent Bubble (In Progress)',
      action: () => addTestMessage('agent_bubble', 'Product Analysis In Progress', {
        agentData: {
          type: 'analysis',
          title: '📄 Product Page Analysis',
          icon: 'FileSearch',
          startTime: new Date(),
          endTime: null,
          sections: [
            {
              id: '1',
              title: 'Page Content Scan',
              description: 'Reading structure & product info...',
              icon: 'FileText',
              status: 'completed',
              data: 'Found product details, pricing, and key features'
            },
            {
              id: '2',
              title: 'Visual Asset Check',
              description: 'Identifying relevant imagery...',
              icon: 'ImageIcon',
              status: 'active',
              data: null
            }
          ],
          isCompleted: false
        }
      })
    },
    {
      label: 'Agent Bubble (Completed)',
      action: () => addTestMessage('agent_bubble', 'Product Analysis Complete', {
        agentData: {
          type: 'analysis',
          title: '📄 Product Page Analysis',
          icon: 'FileSearch',
          startTime: new Date(Date.now() - 15000), // 15 seconds ago
          endTime: new Date(),
          sections: [
            {
              id: '1',
              title: 'Page Content Scan',
              description: 'Reading structure & product info...',
              icon: 'FileText',
              status: 'completed',
              data: 'Found product details, pricing, and key features'
            },
            {
              id: '2',
              title: 'Visual Asset Check',
              description: 'Identifying relevant imagery...',
              icon: 'ImageIcon',
              status: 'completed',
              data: 'Found 3 high-quality product images'
            }
          ],
          isCompleted: true
        }
      })
    },
    {
      label: 'Agent Output',
      action: () => addTestMessage('agent_output', 'Here are 3 compelling ad concepts:\n\n1. "Transform Your Morning Routine"\n2. "The Smart Choice for Busy Professionals"\n3. "Discover What You\'ve Been Missing"', {
        imageUrls: [
          'https://picsum.photos/400/300?random=1',
          'https://picsum.photos/400/300?random=2'
        ]
      })
    },
    {
      label: 'Error Message',
      action: () => addTestMessage('error', 'Something went wrong during the image generation step. Would you like to retry?')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Chat Bubble UI Test</h1>

        {/* Controls */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Test Controls</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {testMessages.map((test, index) => (
              <button
                key={index}
                onClick={test.action}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
              >
                {test.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => clearMessages()}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setShowBanner(!showBanner)}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              Toggle Banner
            </button>
            <button
              onClick={() => setShowScrollButton(!showScrollButton)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Toggle Scroll Button
            </button>
          </div>

          {/* Sound Effect Tests */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-semibold mb-2">Sound Effects Test:</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => playSFX.play('message_send')}
                className="px-3 py-1 bg-blue-400 text-white rounded text-xs hover:bg-blue-500"
              >
                Send Sound
              </button>
              <button
                onClick={() => playSFX.play('message_receive')}
                className="px-3 py-1 bg-green-400 text-white rounded text-xs hover:bg-green-500"
              >
                Receive Sound
              </button>
              <button
                onClick={() => playSFX.play('agent_complete')}
                className="px-3 py-1 bg-purple-400 text-white rounded text-xs hover:bg-purple-500"
              >
                Complete Sound
              </button>
              <button
                onClick={() => playSFX.play('copy_success')}
                className="px-3 py-1 bg-yellow-400 text-white rounded text-xs hover:bg-yellow-500"
              >
                Copy Sound
              </button>
              <button
                onClick={() => playSFX.play('error')}
                className="px-3 py-1 bg-red-400 text-white rounded text-xs hover:bg-red-500"
              >
                Error Sound
              </button>
            </div>
          </div>
        </div>

        {/* Active Task Banner */}
        <ActiveTaskBanner
          isVisible={showBanner}
          currentStage="Generating Ad Concepts"
          startTime={new Date()}
          currentStep={3}
          totalSteps={5}
        />

        {/* Chat Area */}
        <div className="bg-white rounded-lg shadow-sm h-96 relative">
          <ScrollArea className="h-full p-4">
            <div className="space-y-1">
              {messages.map((message) => (
                <MessageRenderer key={message.id} message={message} />
              ))}
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Use the buttons above to add test messages.
                </div>
              )}
            </div>
          </ScrollArea>

          <ScrollToBottom
            isVisible={showScrollButton}
            onClick={() => console.log('Scroll to bottom clicked')}
          />
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Testing Features:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• Enhanced bubble designs with proper spacing (24px gaps)</li>
            <li>• <strong>Left-side animations</strong>: AI responses slide in from left (-20px translateX)</li>
            <li>• <strong>Agent animations</strong>: Agent bubbles slide in from left (-24px translateX)</li>
            <li>• <strong>In-progress effects</strong>: Active agent bubbles have pulse + glow animations</li>
            <li>• Framer Motion animations (fadeSlide, scaleFade, inProgressPulse)</li>
            <li>• New design tokens (pm-indigo, pm-emerald, pm-bubble-*)</li>
            <li>• Live timers and status indicators</li>
            <li>• Copy functionality for generated content</li>
            <li>• Temporary status bubbles with auto-dismiss</li>
            <li>• Agent bubbles with expandable sections</li>
            <li>• Smart scroll behavior and scroll-to-bottom button</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
