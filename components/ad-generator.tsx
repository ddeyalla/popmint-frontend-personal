'use client';

import React, { useState, useEffect } from 'react';
import { adGenerationService, GenerateAdRequest } from '@/lib/ad-generation-service';
import { useEventSource } from '@/lib/use-event-source';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types for the component
interface AdGeneratorProps {
  defaultProductUrl?: string;
  defaultImageCount?: number;
}

// Types for the SSE data
interface SSEData {
  stage?: string;
  progress?: number;
  message?: string;
  images?: string[];
  error?: string;
}

// Types for the generation state
interface GenerationState {
  status: 'idle' | 'connecting' | 'generating' | 'complete' | 'error';
  jobId: string | null;
  progress: number;
  currentStage: string;
  messages: { type: string; content: string; timestamp: Date }[];
  images: string[];
  error: string | null;
}

export default function AdGenerator({ defaultProductUrl = '', defaultImageCount = 4 }: AdGeneratorProps) {
  // Form state
  const [productUrl, setProductUrl] = useState<string>(defaultProductUrl);
  const [imageCount, setImageCount] = useState<number>(defaultImageCount);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Generation state
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    jobId: null,
    progress: 0,
    currentStage: '',
    messages: [],
    images: [],
    error: null,
  });
  
  // SSE connection
  const { connect, disconnect, connected, error: sseError } = useEventSource(undefined, {
    onEvent: (eventName, data) => handleSSEEvent(eventName, data),
    autoConnect: false,
  });
  
  // Effect to handle SSE connection errors
  useEffect(() => {
    if (sseError) {
      console.error('SSE connection error:', sseError);
      setGenerationState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to connect to the generation stream. Please try again.',
      }));
      setIsSubmitting(false);
    }
  }, [sseError]);
  
  // Handle the different types of SSE events
  const handleSSEEvent = (eventName: string, data: SSEData) => {
    console.log(`Received ${eventName} event:`, data);
    
    switch (eventName) {
      case 'agentProgress':
      case 'progress':
        // Handle progress updates
        {
          const messageContent = data.message || `Progress: ${data.progress || 0}%`;
          setGenerationState(prev => ({
            ...prev,
            status: 'generating',
            currentStage: data.stage || prev.currentStage,
            progress: data.progress || prev.progress,
            messages: [
              ...prev.messages,
              {
                type: 'progress',
                content: messageContent,
                timestamp: new Date()
              }
            ]
          }));
        }
        break;
        
      case 'agentOutput':
      case 'complete':
        // Handle completion events
        {
          const messageContent = data.message || 'Generation complete!';
          setGenerationState(prev => ({
            ...prev,
            status: 'complete',
            progress: 100,
            messages: [
              ...prev.messages,
              {
                type: 'complete',
                content: messageContent,
                timestamp: new Date()
              }
            ],
            images: data.images || prev.images
          }));
          setIsSubmitting(false);
          disconnect(); // Close the connection as we're done
        }
        break;
        
      case 'error':
        // Handle error events
        {
          const errorMessage = data.error || 'An unknown error occurred';
          setGenerationState(prev => ({
            ...prev,
            status: 'error',
            error: errorMessage,
            messages: [
              ...prev.messages,
              {
                type: 'error',
                content: errorMessage,
                timestamp: new Date()
              }
            ]
          }));
          setIsSubmitting(false);
          disconnect(); // Close the connection as we got an error
        }
        break;
        
      case 'cancelled':
        // Handle cancellation events
        {
          const cancelMessage = 'Generation was cancelled';
          setGenerationState(prev => ({
            ...prev,
            status: 'idle',
            messages: [
              ...prev.messages,
              {
                type: 'cancelled',
                content: cancelMessage,
                timestamp: new Date()
              }
            ]
          }));
          setIsSubmitting(false);
          disconnect(); // Close the connection as we've been cancelled
        }
        break;
        
      case 'message':
      default:
        // Default handler for other types of messages
        if (data.message) {
          const messageText = data.message; // Store in a const to ensure it's a string
          setGenerationState(prev => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                type: 'message',
                content: messageText,
                timestamp: new Date()
              }
            ]
          }));
        }
        break;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productUrl) {
      setGenerationState(prev => ({
        ...prev,
        status: 'error',
        error: 'Product URL is required'
      }));
      return;
    }
    
    try {
      setIsSubmitting(true);
      setGenerationState({
        status: 'connecting',
        jobId: null,
        progress: 0,
        currentStage: 'Connecting to service',
        messages: [
          {
            type: 'info',
            content: 'Starting ad generation',
            timestamp: new Date()
          }
        ],
        images: [],
        error: null,
      });
      
      // Start the generation
      const request: GenerateAdRequest = {
        product_url: productUrl,
        n_images: imageCount
      };
      
      const response = await adGenerationService.startGeneration(request);
      
      // If we got a job ID, connect to the SSE stream
      if (response.job_id) {
        setGenerationState(prev => ({
          ...prev,
          jobId: response.job_id,
          messages: [
            ...prev.messages,
            {
              type: 'info',
              content: `Generation job started with ID: ${response.job_id}`,
              timestamp: new Date()
            }
          ]
        }));
        
        // Connect to the SSE stream
        const streamUrl = adGenerationService.getStreamUrl(response.job_id);
        connect(streamUrl);
      } else {
        throw new Error('No job ID returned from service');
      }
    } catch (error: any) {
      console.error('Failed to start generation:', error);
      setGenerationState(prev => ({
        ...prev,
        status: 'error',
        error: error.message || 'Failed to start generation'
      }));
      setIsSubmitting(false);
    }
  };
  
  // Handle cancellation
  const handleCancel = async () => {
    if (generationState.jobId) {
      try {
        await adGenerationService.cancelJob(generationState.jobId);
        setGenerationState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              type: 'info',
              content: 'Cancellation request sent',
              timestamp: new Date()
            }
          ]
        }));
      } catch (error: any) {
        console.error('Failed to cancel job:', error);
        setGenerationState(prev => ({
          ...prev,
          messages: [
            ...prev.messages,
            {
              type: 'error',
              content: `Failed to cancel: ${error.message || 'Unknown error'}`,
              timestamp: new Date()
            }
          ]
        }));
      }
    }
  };
  
  // Reset the form and state
  const handleReset = () => {
    setGenerationState({
      status: 'idle',
      jobId: null,
      progress: 0,
      currentStage: '',
      messages: [],
      images: [],
      error: null,
    });
    disconnect();
  };
  
  // Render the progress/status
  const renderProgress = () => {
    switch (generationState.status) {
      case 'connecting':
        return <div className="text-amber-500">Connecting to ad generation service...</div>;
      
      case 'generating':
        return (
          <div>
            <div className="mb-2 font-bold">{generationState.currentStage}</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${generationState.progress}%` }}
              ></div>
            </div>
          </div>
        );
      
      case 'complete':
        return <div className="text-green-600 font-bold">Ad generation complete!</div>;
      
      case 'error':
        return <div className="text-red-600 font-bold">Error: {generationState.error}</div>;
      
      default:
        return null;
    }
  };
  
  // Render the activity log
  const renderActivityLog = () => {
    if (generationState.messages.length === 0) {
      return <div className="text-gray-500">No activity yet</div>;
    }
    
    return (
      <ScrollArea className="h-48 rounded-md border p-4">
        {generationState.messages.map((msg, index) => (
          <div key={index} className="mb-2">
            <span className="text-xs text-gray-500">
              {msg.timestamp.toLocaleTimeString()}
            </span>
            <span className={`ml-2 ${
              msg.type === 'error' ? 'text-red-600' : 
              msg.type === 'complete' ? 'text-green-600' :
              msg.type === 'progress' ? 'text-blue-600' :
              'text-gray-800'
            }`}>
              {msg.content}
            </span>
          </div>
        ))}
      </ScrollArea>
    );
  };
  
  // Render the generated images
  const renderImages = () => {
    if (generationState.images.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-6">
        <h3 className="text-lg font-bold mb-4">Generated Ad Images</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generationState.images.map((imageUrl, index) => (
            <div key={index} className="rounded-lg overflow-hidden border shadow-sm">
              <img 
                src={imageUrl} 
                alt={`Generated ad ${index + 1}`} 
                className="w-full h-auto"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Ad Generation</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="space-y-2">
          <label htmlFor="productUrl" className="block text-sm font-medium">
            Product URL
          </label>
          <input
            id="productUrl"
            type="url"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://example.com/product-page"
            className="w-full p-2 border rounded-md"
            required
            disabled={isSubmitting || generationState.status === 'generating'}
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="imageCount" className="block text-sm font-medium">
            Number of Images (1-10)
          </label>
          <input
            id="imageCount"
            type="number"
            value={imageCount}
            onChange={(e) => setImageCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 4)))}
            min="1"
            max="10"
            className="w-full p-2 border rounded-md"
            disabled={isSubmitting || generationState.status === 'generating'}
          />
        </div>
        
        <div className="flex space-x-2">
          <Button
            type="submit"
            disabled={isSubmitting || !productUrl || generationState.status === 'generating'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Starting...' : 'Generate Ads'}
          </Button>
          
          {generationState.status === 'generating' && (
            <Button
              type="button"
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel Generation
            </Button>
          )}
          
          {(generationState.status === 'complete' || generationState.status === 'error') && (
            <Button
              type="button"
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Reset
            </Button>
          )}
        </div>
      </form>
      
      <Separator className="my-6" />
      
      <div className="space-y-6">
        {renderProgress()}
        
        <div>
          <h3 className="text-lg font-bold mb-2">Activity Log</h3>
          {renderActivityLog()}
        </div>
        
        {renderImages()}
      </div>
    </div>
  );
} 