"use client";

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';

export default function TestPersistencePage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [projectId, setProjectId] = useState<string>('');

  const { addMessage, messages, clearMessages } = useChatStore();
  const { addImage, objects, setObjects } = useCanvasStore();
  const { hydrateProject, currentProjectId } = useProjectStore();

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runPersistenceTest = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Generate a unique test session ID
      const testSessionId = `test-${Date.now()}`;
      setProjectId(testSessionId);

      addTestResult(`🧪 Starting persistence test with session: ${testSessionId}`);

      // Step 1: Initialize persistence
      addTestResult('📝 Step 1: Initializing persistence...');
      const success = await hydrateProject(testSessionId);

      if (success) {
        addTestResult(`✅ Persistence initialized successfully. Project ID: ${currentProjectId}`);
      } else {
        addTestResult('❌ Persistence initialization failed');
        return;
      }

      // Step 2: Clear existing data
      addTestResult('🧹 Step 2: Clearing existing data...');
      clearMessages();
      setObjects([]);
      addTestResult('✅ Data cleared');

      // Step 3: Add test messages
      addTestResult('💬 Step 3: Adding test messages...');
      const messageIds = [
        addMessage({
          role: 'user',
          type: 'text',
          content: 'Hello, this is test message 1!'
        }),
        addMessage({
          role: 'assistant',
          type: 'text',
          content: 'Hi there! This is test message 2.'
        }),
        addMessage({
          role: 'user',
          type: 'text',
          content: 'Can you help me test persistence?'
        })
      ];
      addTestResult(`✅ Added ${messageIds.length} test messages`);

      // Step 4: Add test canvas objects
      addTestResult('🎨 Step 4: Adding test canvas objects...');
      addImage('https://supertails.com/cdn/shop/articles/golden-retriever_eb2c9eb0-8f1d-4b87-b2ed-ee467d51f7f0_1200x.jpg?v=1747053622', 50, 50, true);
      addImage('https://heronscrossing.vet/wp-content/uploads/Golden-Retriever-2048x1365.jpg', 600, 50, true);
      addImage('https://spotpet.com/_next/image?url=https%3A%2F%2Fimages.ctfassets.net%2Fm5ehn3s5t7ec%2FKtxCRW7y0LXNYcn6BHPPD%2F065b05bda2e516ea6a5887ce9856d1db%2FGolden_Retriever__Price.webp&w=3840&q=75', 325, 600, true);
      addTestResult('✅ Added 3 Golden Retriever test images');

      // Step 5: Wait for persistence to save
      addTestResult('⏳ Step 5: Waiting for persistence to save...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      addTestResult('✅ Wait completed');

      // Step 6: Verify data was saved via API
      addTestResult('🔍 Step 6: Verifying data was saved...');

      try {
        // Check chat messages
        const chatResponse = await fetch(`/api/projects/${currentProjectId}/chat`);
        const chatData = await chatResponse.json();
        addTestResult(`✅ Found ${chatData.messages?.length || 0} saved chat messages`);

        // Check canvas objects
        const canvasResponse = await fetch(`/api/projects/${currentProjectId}/canvas`);
        const canvasData = await canvasResponse.json();
        addTestResult(`✅ Found ${canvasData.objects?.length || 0} saved canvas objects`);

        if (chatData.messages?.length >= 3 && canvasData.objects?.length >= 3) {
          addTestResult('🎉 PERSISTENCE TEST PASSED! All data was saved correctly.');
        } else {
          addTestResult('❌ PERSISTENCE TEST FAILED! Some data was not saved.');
        }

      } catch (error) {
        addTestResult(`❌ Error verifying saved data: ${error}`);
      }

    } catch (error) {
      addTestResult(`❌ Test failed with error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runHydrationTest = async () => {
    if (!currentProjectId) {
      addTestResult('❌ No project ID available. Run persistence test first.');
      return;
    }

    setIsRunning(true);
    addTestResult('🔄 Starting hydration test...');

    try {
      // Step 1: Clear current data
      addTestResult('🧹 Clearing current data...');
      clearMessages();
      setObjects([]);
      addTestResult('✅ Data cleared');

      // Step 2: Re-hydrate the project
      addTestResult('💧 Re-hydrating project...');
      const success = await hydrateProject(currentProjectId);

      if (success) {
        addTestResult('✅ Project re-hydrated successfully');
      } else {
        addTestResult('❌ Project re-hydration failed');
        return;
      }

      // Step 3: Wait for hydration to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Check if data was restored
      addTestResult('🔍 Checking restored data...');
      addTestResult(`💬 Chat messages restored: ${messages.length}`);
      addTestResult(`🎨 Canvas objects restored: ${objects.length}`);

      if (messages.length >= 3 && objects.length >= 3) {
        addTestResult('🎉 HYDRATION TEST PASSED! All data was restored correctly.');
      } else {
        addTestResult('❌ HYDRATION TEST FAILED! Some data was not restored.');
      }

    } catch (error) {
      addTestResult(`❌ Hydration test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Persistence Test Page</h1>

      <div className="mb-6 space-x-4">
        <button
          onClick={runPersistenceTest}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Persistence Test'}
        </button>

        <button
          onClick={runHydrationTest}
          disabled={isRunning || !currentProjectId}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Hydration Test'}
        </button>
      </div>

      {projectId && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <p><strong>Test Session ID:</strong> {projectId}</p>
          <p><strong>Current Project ID:</strong> {currentProjectId || 'None'}</p>
          <p><strong>Test URL:</strong> <a href={`/playground/${projectId}`} className="text-blue-500 hover:underline" target="_blank">/playground/{projectId}</a></p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index} className="mb-1">{result}</div>
            ))}
            {testResults.length === 0 && (
              <div className="text-gray-500">Click "Run Persistence Test" to start...</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Current State</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Chat Messages ({messages.length})</h3>
              <div className="bg-gray-50 p-2 rounded text-sm max-h-32 overflow-y-auto">
                {messages.map((msg, index) => (
                  <div key={msg.id} className="mb-1">
                    <strong>{msg.role}:</strong> {msg.content}
                  </div>
                ))}
                {messages.length === 0 && <div className="text-gray-500">No messages</div>}
              </div>
            </div>

            <div>
              <h3 className="font-medium">Canvas Objects ({objects.length})</h3>
              <div className="bg-gray-50 p-2 rounded text-sm max-h-32 overflow-y-auto">
                {objects.map((obj, index) => (
                  <div key={obj.id} className="mb-1">
                    <strong>{obj.type}:</strong> ({obj.x}, {obj.y}) {obj.src && `- ${obj.src.substring(0, 50)}...`}
                  </div>
                ))}
                {objects.length === 0 && <div className="text-gray-500">No objects</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
