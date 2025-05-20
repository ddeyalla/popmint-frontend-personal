"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { useCanvasStore } from '@/store/canvasStore';

export default function TestPage() {
  const [prompt, setPrompt] = useState('generate image of a colorful advertisement for a smartphone');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const router = useRouter();
  const messages = useChatStore((state) => state.messages);
  const canvasObjects = useCanvasStore((state) => state.objects);

  // Add to log for debugging
  const addToLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toISOString().substring(11, 19)}: ${message}`]);
  };

  // Clear the log
  const clearLog = () => {
    setLog([]);
  };

  // Test image generation via homepage flow
  const testHomepageFlow = async () => {
    try {
      setIsLoading(true);
      addToLog(`Starting homepage flow test with prompt: "${prompt}"`);

      // Step 1: Create a sessionId
      const sessionId = Math.random().toString(36).substring(2, 9);
      addToLog(`Generated sessionId: ${sessionId}`);

      // Step 2: Set localStorage items for this flow
      const initialMessagePayload = {
        type: "userInput",
        content: prompt,
        imageUrls: []
      };
      
      localStorage.setItem("popmint-initial-message", JSON.stringify(initialMessagePayload));
      localStorage.setItem("popmint-process-image", "true");
      localStorage.setItem("popmint-prompt-to-process", prompt);
      
      addToLog(`Set localStorage items with shouldProcessImage=true. Will route to /playground/${sessionId}`);

      // Step 3: Navigate to playground
      router.push(`/playground/${sessionId}`);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
      addToLog(`Error: ${err.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Display current state for debugging
  useEffect(() => {
    addToLog(`Chat store has ${messages.length} messages`);
    addToLog(`Canvas has ${canvasObjects.length} objects`);
  }, [messages.length, canvasObjects.length]);

  return (
    <div className="flex flex-col min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Image Generation Flow Test</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a prompt for image generation..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        
        <Button
          onClick={testHomepageFlow}
          disabled={isLoading || !prompt.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isLoading ? 'Testing...' : 'Test Homepage Flow'}
        </Button>
      </div>
      
      <div className="border rounded p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Debug Log</h2>
          <Button
            onClick={clearLog}
            variant="outline"
            size="sm"
          >
            Clear Log
          </Button>
        </div>
        <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-gray-500 italic">No logs yet</p>
          ) : (
            <ul className="list-none">
              {log.map((entry, i) => (
                <li key={i} className="text-xs font-mono mb-1">{entry}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="border rounded p-4 mb-4">
        <h2 className="text-lg font-semibold mb-2">Current Chat Messages</h2>
        <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic">No messages yet</p>
          ) : (
            <ul className="list-none">
              {messages.map((msg, i) => (
                <li key={i} className="mb-2 p-2 border rounded bg-white">
                  <p className="font-bold">{msg.type} {msg.subType ? `(${msg.subType})` : ''}</p>
                  <p className="text-sm">{msg.content}</p>
                  {msg.imageUrls && (
                    <p className="text-xs text-blue-500">Has {msg.imageUrls.length} images</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <div className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-2">Canvas Objects</h2>
        <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
          {canvasObjects.length === 0 ? (
            <p className="text-gray-500 italic">No canvas objects yet</p>
          ) : (
            <ul className="list-none">
              {canvasObjects.map((obj, i) => (
                <li key={i} className="mb-2 p-2 border rounded bg-white">
                  <p className="font-bold">{obj.type} (ID: {obj.id.substring(0, 8)}...)</p>
                  {obj.src && (
                    <p className="text-xs text-blue-500 break-all">{obj.src.substring(0, 50)}...</p>
                  )}
                  <p className="text-xs">Position: {obj.x}, {obj.y}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 