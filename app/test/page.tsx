'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function TestPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState('');

  const generateImage = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      // Add user message
      setMessages(prev => [...prev, { type: 'userInput', content: prompt }]);
      
      // Add initial progress message
      setMessages(prev => [...prev, { type: 'agentProgress', content: 'Starting image generation...' }]);

      // Make the API request
      const response = await fetch('/api/agent/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      // Handle SSE response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body cannot be read');
      }

      // Process the stream
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              console.log('Received event:', eventData);
              
              if (eventData.type === 'agentProgress') {
                setMessages(prev => [...prev, { 
                  type: 'agentProgress', 
                  content: eventData.content 
                }]);
              } 
              else if (eventData.type === 'agentOutput') {
                setMessages(prev => [...prev, { 
                  type: 'agentOutput', 
                  content: eventData.content,
                  imageUrls: eventData.imageUrls 
                }]);
              }
            } catch (error) {
              console.error('Failed to parse SSE event:', error);
            }
          }
        }
      }
    } catch (error: any) {
      setError(error.message || 'Failed to generate image');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">DALL-E Image Generation Test</h1>
      
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
          placeholder="Enter a prompt for DALL-E..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button
          onClick={generateImage}
          disabled={isLoading || !prompt.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>
      </div>
      
      <div className="flex flex-col gap-4 w-full">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`p-4 rounded max-w-[80%] ${
              message.type === 'userInput' 
                ? 'bg-blue-100 self-end' 
                : message.type === 'agentProgress'
                  ? 'bg-gray-100 italic self-start'
                  : 'bg-white border self-start'
            }`}
          >
            <p>{message.content}</p>
            
            {message.imageUrls && message.imageUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.imageUrls.map((url: string, i: number) => (
                  <div key={i} className="relative border rounded overflow-hidden">
                    <img 
                      src={url} 
                      alt={`Generated image ${i+1}`}
                      width={400}
                      height={400}
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 