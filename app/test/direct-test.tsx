"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function DirectTest() {
  const [prompt, setPrompt] = useState('generate a colorful advertisement');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add a log message
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [`${new Date().toISOString().slice(11, 19)} - ${message}`, ...prev]);
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Test direct API call
  const testDirectApi = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setImages([]);
    addLog(`Starting direct API test with prompt: "${prompt}"`);
    
    try {
      // Make direct API call to generate image
      addLog(`Making API request to /api/agent/generate-image`);
      
      const response = await fetch('/api/agent/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      addLog(`Response received with status: ${response.status}`);
      
      // Process SSE response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Cannot read response stream');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          addLog(`Stream completed`);
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              addLog(`Received event: ${data.type}`);
              
              if (data.type === 'agentProgress') {
                addLog(`Progress: ${data.content}`);
              } 
              else if (data.type === 'agentOutput') {
                addLog(`Output: ${data.content}`);
                
                if (data.imageUrls && data.imageUrls.length > 0) {
                  addLog(`Received ${data.imageUrls.length} images`);
                  setImages(data.imageUrls);
                  
                  // For each image, create a proxied URL
                  const proxiedUrls = data.imageUrls.map((url: string) => 
                    `/api/proxy-image?url=${encodeURIComponent(url)}`
                  );
                  addLog(`Created proxied URLs: ${proxiedUrls.length}`);
                }
              }
            } catch (err) {
              addLog(`Error parsing event: ${err}`);
            }
          }
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      addLog(`ERROR: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Direct API Test</h1>
      
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter prompt..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <Button
            onClick={testDirectApi}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Testing...' : 'Test API Directly'}
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded border border-red-300">
            {error}
          </div>
        )}
      </div>
      
      {/* Images section */}
      {images.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Generated Images:</h2>
          <div className="grid grid-cols-2 gap-4">
            {images.map((url, index) => (
              <div key={index} className="border rounded p-2">
                <p className="text-sm mb-1">Image {index + 1}</p>
                <div className="relative aspect-video">
                  <img 
                    src={`/api/proxy-image?url=${encodeURIComponent(url)}`}
                    alt={`Generated image ${index + 1}`}
                    className="object-contain w-full h-full"
                    onLoad={() => addLog(`Image ${index + 1} loaded successfully`)}
                    onError={() => addLog(`Image ${index + 1} failed to load`)}
                  />
                </div>
                <p className="text-xs mt-1 break-all text-gray-500">{url.substring(0, 50)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Logs section */}
      <div className="border rounded p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Logs:</h2>
          <Button variant="outline" size="sm" onClick={clearLogs}>Clear</Button>
        </div>
        <div className="bg-gray-100 p-2 rounded max-h-80 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">No logs yet</p>
          ) : (
            <div className="flex flex-col-reverse">
              {logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`py-1 px-2 ${i % 2 === 0 ? 'bg-gray-100' : 'bg-gray-200'}`}
                >
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 