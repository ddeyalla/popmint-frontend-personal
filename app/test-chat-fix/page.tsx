"use client";

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useProjectStore } from '@/store/projectStore';
import { initializePersistence } from '@/lib/persistence-manager';

export default function TestChatFix() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { messages, addMessage, clearMessages, setMessages } = useChatStore();
  const { currentProjectId, hydrateProject } = useProjectStore();

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addTestResult('🧪 Starting chat persistence test...');
      
      // 1. Clear existing messages
      clearMessages();
      addTestResult('✅ Cleared existing messages');
      
      // 2. Initialize project
      const testProjectId = 'test-chat-fix-' + Date.now();
      addTestResult(`🚀 Initializing project: ${testProjectId}`);
      
      await hydrateProject(testProjectId);
      addTestResult(`✅ Project initialized: ${currentProjectId}`);
      
      // 3. Add different types of messages
      addTestResult('📝 Adding test messages...');
      
      // Simple text message (should persist)
      const textId = addMessage({
        role: 'user',
        type: 'text',
        content: 'This is a simple text message that should persist'
      });
      addTestResult(`✅ Added text message: ${textId}`);
      
      // Agent output message (should persist)
      const agentId = addMessage({
        role: 'assistant',
        type: 'agent_output',
        content: 'This is an agent response that should persist',
        imageUrls: ['https://example.com/image1.jpg']
      });
      addTestResult(`✅ Added agent output message: ${agentId}`);
      
      // Complex message that shouldn't persist
      const complexId = addMessage({
        role: 'assistant',
        type: 'ad_generation',
        content: 'This is a complex ad generation message',
        adData: {
          jobId: 'test-job',
          stage: 'thinking',
          progress: 50,
          stepTimings: []
        }
      });
      addTestResult(`✅ Added complex message (won't persist): ${complexId}`);
      
      // Temporary message that shouldn't persist
      const tempId = addMessage({
        role: 'assistant',
        type: 'temporary_status',
        content: 'This is a temporary message',
        isTemporary: true
      });
      addTestResult(`✅ Added temporary message (won't persist): ${tempId}`);
      
      addTestResult(`📊 Total messages in store: ${messages.length}`);
      
      // 4. Wait for persistence to complete
      addTestResult('⏳ Waiting for persistence to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 5. Test API directly
      addTestResult('🌐 Testing API directly...');
      const response = await fetch(`/api/projects/${currentProjectId}/chat`);
      if (response.ok) {
        const data = await response.json();
        addTestResult(`📥 API returned ${data.messages?.length || 0} messages`);
        data.messages?.forEach((msg: any, index: number) => {
          addTestResult(`  ${index + 1}. ${msg.role}: ${msg.message_type} - "${msg.content.substring(0, 50)}..."`);
        });
      } else {
        addTestResult(`❌ API error: ${response.status}`);
      }
      
      // 6. Test reload simulation
      addTestResult('🔄 Simulating page reload...');
      clearMessages();
      addTestResult('✅ Cleared store (simulating reload)');
      
      // Re-initialize persistence
      await initializePersistence(currentProjectId!);
      addTestResult('✅ Re-initialized persistence');
      
      // Wait for hydration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addTestResult(`📊 Messages after reload: ${messages.length}`);
      messages.forEach((msg, index) => {
        addTestResult(`  ${index + 1}. ${msg.role}: ${msg.type} - "${msg.content.substring(0, 50)}..."`);
      });
      
      addTestResult('🎉 Test completed!');
      
    } catch (error) {
      addTestResult(`❌ Test failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Chat Persistence Fix Test</h1>
      
      <div className="mb-6">
        <button
          onClick={runTest}
          disabled={isRunning}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isRunning ? 'Running Test...' : 'Run Chat Persistence Test'}
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Current State:</h2>
        <p>Project ID: {currentProjectId || 'None'}</p>
        <p>Messages in store: {messages.length}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
        <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No test results yet. Click "Run Test" to start.</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {result}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-2">Current Messages:</h2>
        <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages in store</p>
          ) : (
            messages.map((msg, index) => (
              <div key={msg.id} className="text-sm mb-2 p-2 bg-white rounded">
                <div className="font-semibold">{index + 1}. {msg.role} ({msg.type})</div>
                <div className="text-gray-600">{msg.content}</div>
                <div className="text-xs text-gray-400">ID: {msg.id}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
