"use client";

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { uploadImageToStorage } from '@/lib/supabase-storage';
import { isAutoPersistenceActive, initializeAutoPersistence, getPersistenceMetrics, resetPersistenceMetrics } from '@/lib/auto-persistence';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details: any;
}

export default function TestPersistenceFix() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [projectId, setProjectId] = useState<string>('');
  const [metrics, setMetrics] = useState<any>(null);

  const { addMessage, messages, clearMessages } = useChatStore();
  const { addImage, objects, setObjects } = useCanvasStore();
  const { hydrateProject, currentProjectId, createProjectFromPrompt } = useProjectStore();

  // Update metrics every 2 seconds when active
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAutoPersistenceActive()) {
        setMetrics(getPersistenceMetrics());
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, { test: result, status: 'success', message: result, details: {} }]);
  };

  const runFullPersistenceTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addTestResult('🧪 Starting comprehensive persistence test...');
      
      // 1. Create a new project
      addTestResult('🚀 Creating new project...');
      const newProjectId = await createProjectFromPrompt('Test persistence for image and chat functionality');
      
      if (!newProjectId) {
        throw new Error('Failed to create project');
      }
      
      setProjectId(newProjectId);
      addTestResult(`✅ Project created: ${newProjectId}`);
      
      // 2. Initialize auto-persistence
      addTestResult('🔧 Initializing auto-persistence...');
      const success = await hydrateProject(newProjectId);
      addTestResult(`${success ? '✅' : '❌'} Auto-persistence initialized: ${success}`);
      
      // 3. Test chat message persistence
      addTestResult('💬 Testing chat message persistence...');
      
      // Add different types of messages
      const textMessageId = addMessage({
        role: 'user',
        type: 'text',
        content: 'This is a test message that should be saved to Supabase'
      });
      addTestResult(`✅ Added text message: ${textMessageId}`);
      
      const agentMessageId = addMessage({
        role: 'assistant',
        type: 'agent_output',
        content: 'This is an agent response that should be saved',
        imageUrls: ['https://picsum.photos/512/512?random=1']
      });
      addTestResult(`✅ Added agent message: ${agentMessageId}`);
      
      // 4. Test canvas object persistence
      addTestResult('🎨 Testing canvas object persistence...');
      
      // Add a test image to canvas
      addImage('https://picsum.photos/512/512?random=2', 50, 50, true);
      addTestResult('✅ Added image to canvas (should auto-upload to Supabase Storage)');
      
      // 5. Wait for persistence to complete
      addTestResult('⏳ Waiting for persistence operations to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 6. Test API directly to verify data was saved
      addTestResult('🌐 Verifying data in Supabase via API...');
      
      // Check chat messages
      try {
        const chatResponse = await fetch(`/api/projects/${newProjectId}/chat`);
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          addTestResult(`📥 API returned ${chatData.messages?.length || 0} chat messages`);
          
          chatData.messages?.forEach((msg: any, index: number) => {
            addTestResult(`  ${index + 1}. ${msg.role}: ${msg.message_type} - "${msg.content.substring(0, 30)}..."`);
          });
        } else {
          addTestResult(`❌ Chat API error: ${chatResponse.status}`);
        }
      } catch (error) {
        addTestResult(`❌ Chat API error: ${error}`);
      }
      
      // Check canvas objects
      try {
        const canvasResponse = await fetch(`/api/projects/${newProjectId}/canvas`);
        if (canvasResponse.ok) {
          const canvasData = await canvasResponse.json();
          addTestResult(`📥 API returned ${canvasData.objects?.length || 0} canvas objects`);
          
          canvasData.objects?.forEach((obj: any, index: number) => {
            const srcPreview = obj.src ? (obj.src.length > 50 ? obj.src.substring(0, 50) + '...' : obj.src) : 'none';
            addTestResult(`  ${index + 1}. ${obj.type} at (${obj.x}, ${obj.y}) - src: ${srcPreview}`);
          });
        } else {
          addTestResult(`❌ Canvas API error: ${canvasResponse.status}`);
        }
      } catch (error) {
        addTestResult(`❌ Canvas API error: ${error}`);
      }
      
      // 7. Test reload simulation
      addTestResult('🔄 Testing reload simulation...');
      
      // Clear stores (simulating page reload)
      clearMessages();
      setObjects([]);
      addTestResult('✅ Cleared stores (simulating reload)');
      
      // Re-initialize persistence (simulating page load)
      const reloadSuccess = await hydrateProject(newProjectId);
      addTestResult(`${reloadSuccess ? '✅' : '❌'} Re-initialized persistence: ${reloadSuccess}`);
      
      // Wait for hydration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if data was restored
      const restoredMessages = messages.length;
      const restoredObjects = objects.length;
      
      addTestResult(`📊 Restored ${restoredMessages} messages and ${restoredObjects} canvas objects`);
      
      if (restoredMessages > 0 && restoredObjects > 0) {
        addTestResult('🎉 PERSISTENCE TEST PASSED! Data was successfully saved and restored.');
      } else {
        addTestResult('⚠️ PERSISTENCE TEST PARTIAL: Some data may not have been restored.');
      }
      
      // 8. Test auto-persistence status
      addTestResult('📊 Checking auto-persistence status...');
      const { getAutoPersistenceStatus } = await import('@/lib/auto-persistence');
      const status = getAutoPersistenceStatus();
      addTestResult(`📊 Auto-persistence active: ${status.isActive}, project: ${status.projectId}`);
      
    } catch (error) {
      console.error('Test error:', error);
      addTestResult(`❌ Test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testImageUpload = async () => {
    if (!projectId) {
      addTestResult('❌ No project ID - create a project first');
      return;
    }

    try {
      addTestResult('🖼️ Testing direct image upload to Supabase Storage...');
      
      const { uploadImageFromUrl } = await import('@/lib/supabase-storage');
      const result = await uploadImageFromUrl(
        projectId,
        'https://picsum.photos/512/512?random=3',
        `${projectId}/test-upload-${Date.now()}.jpg`
      );
      
      if (result.success) {
        addTestResult(`✅ Image uploaded successfully: ${result.url}`);
        
        // Add to canvas to test integration
        addImage(result.url!, 100, 100, true);
        addTestResult('✅ Added uploaded image to canvas');
      } else {
        addTestResult(`❌ Image upload failed: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Image upload error: ${error}`);
    }
  };

  const resetMetrics = () => {
    resetPersistenceMetrics();
    setMetrics(getPersistenceMetrics());
    addTestResult('Reset Metrics');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          🔧 Enhanced Persistence System Test
        </h1>

        {/* Performance Metrics Card */}
        {metrics && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-blue-800">Performance Metrics</h3>
              <button
                onClick={resetMetrics}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Reset Metrics
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Chat:</strong> {metrics.chatSuccessRate} 
                ({metrics.chatSaveSuccesses}/{metrics.chatSaveAttempts})
              </div>
              <div>
                <strong>Canvas:</strong> {metrics.canvasSuccessRate} 
                ({metrics.canvasSaveSuccesses}/{metrics.canvasSaveAttempts})
              </div>
              <div>
                <strong>Uptime:</strong> {Math.round(metrics.uptime / 1000)}s
              </div>
              <div>
                <strong>Status:</strong> 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  isAutoPersistenceActive() 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isAutoPersistenceActive() ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={runFullPersistenceTest}
            disabled={isRunning}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
          >
            {isRunning ? 'Running Tests...' : 'Run Full Persistence Test'}
          </button>
          
          <button
            onClick={testImageUpload}
            disabled={isRunning || !projectId}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
          >
            Test Image Upload
          </button>
          
          <button
            onClick={() => setTestResults([])}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Clear Results
          </button>
        </div>
        
        {projectId && (
          <div className="text-sm text-gray-600 mb-4">
            <strong>Current Project ID:</strong> {projectId}
          </div>
        )}
        
        <div className="text-sm text-gray-600 mb-4">
          <strong>Current State:</strong> {messages.length} messages, {objects.length} canvas objects
        </div>
      </div>
    </div>
  );
} 