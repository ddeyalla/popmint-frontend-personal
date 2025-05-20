"use client"

import { useState } from "react"
import { useChatStore } from "@/store/chatStore"
import { useCanvasStore } from "@/store/canvasStore"
import { AIInputWithSearch } from "@/components/ui/ai-input-with-search"
import { generateImageFromPrompt } from '@/lib/generate-image'

// Simple function to test if an image URL is valid
function testImageUrl(url: string) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export function ChatInput() {
  const [isLoading, setIsLoading] = useState(false)
  const addMessage = useChatStore((state) => state.addMessage)
  const addImage = useCanvasStore((state) => state.addImage)
  const objects = useCanvasStore((state) => state.objects)

  // Function to proxy an image URL through our proxy API
  const getProxiedImageUrl = (url: string) => {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // Function to check if an image already exists on the canvas
  const imageExistsOnCanvas = (url: string): boolean => {
    // Get the base URL without the proxy
    const isProxied = url.startsWith('/api/proxy-image');
    const originalUrl = isProxied 
      ? decodeURIComponent(url.split('?url=')[1] || '')
      : url;
    
    // Check if any object on the canvas has this URL (or its proxied version)
    return objects.some(obj => {
      if (!obj.src) return false;
      
      const objIsProxied = obj.src.startsWith('/api/proxy-image');
      const objOriginalUrl = objIsProxied 
        ? decodeURIComponent(obj.src.split('?url=')[1] || '')
        : obj.src;
      
      return objOriginalUrl === originalUrl || obj.src === url;
    });
  };

  const handleSubmit = async (value: string, withSearch: boolean) => {
    if (!value.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Add user message
      addMessage({ type: "userInput", content: value });
      console.log('[ChatInput] User submitted prompt:', value);
      
      // Detect /image or 'generate image' command
      const isImageRequest = value.trim().toLowerCase().startsWith('/image') || value.trim().toLowerCase().includes('generate image');
      if (isImageRequest) {
        try {
          // Generate image using shared helper
          const proxiedUrl = await generateImageFromPrompt(value);
          // Add to canvas if not already present
          if (!imageExistsOnCanvas(proxiedUrl)) {
            addImage(proxiedUrl, 20, 20);
            addMessage({ type: 'agentOutput', content: 'Here is your generated image!' });
          } else {
            addMessage({ type: 'agentOutput', content: 'Image already exists on canvas.' });
          }
        } catch (err: any) {
          addMessage({ type: 'agentOutput', content: `Error: ${err.message || 'Failed to generate image'}` });
        } finally {
          setIsLoading(false);
        }
        return;
      }
      
      // Simple test command
      if (value.toLowerCase() === 'test image') {
        const testUrl = "https://cdn.pixabay.com/photo/2023/06/02/14/10/nature-8035240_1280.jpg";
        
        setTimeout(() => {
          addMessage({ 
            type: 'agentOutput', 
            content: 'Here is your test image:', 
            imageUrls: [testUrl],
            subType: 'image_generated', // Mark as generated for canvas
          });
          
          // Add to canvas directly for test images if it doesn't exist already
          if (!imageExistsOnCanvas(testUrl)) {
            addImage(testUrl, 20, 20);
            console.log('[ChatInput] Test image added to canvas');
          } else {
            console.log('[ChatInput] Test image already exists on canvas, skipping');
          }
          
          setIsLoading(false);
        }, 1000);
        
        return;
      }
      
      // Make an API call to generate image
      console.log('[ChatInput] Making API call to generate image with prompt:', value);
      
      // Add initial progress message
      addMessage({ type: 'agentProgress', content: 'Processing your request...' });
      
      const response = await fetch('/api/agent/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: value }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Process the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Could not read server response');
      }
      
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
              const data = JSON.parse(line.slice(6));
              console.log('[ChatInput] Received SSE event:', data);
              
              if (data.type === 'agentProgress') {
                addMessage({ 
                  type: 'agentProgress', 
                  content: data.content 
                });
                console.log('[ChatInput] Progress event:', data.content);
              } 
              else if (data.type === 'agentOutput') {
                if (data.imageUrls && data.imageUrls.length > 0) {
                  // Add chat message with only text content first so UI updates
                  addMessage({
                    type: 'agentOutput',
                    content: data.content
                  });
                  
                  // DALL-E image: add to canvas, do NOT add imageUrls to chat message
                  await Promise.all(data.imageUrls.map(async (url: string, i: number) => {
                    try {
                      // Skip if the image already exists on canvas
                      if (imageExistsOnCanvas(url)) {
                        console.log('[ChatInput] Image already exists on canvas, skipping:', url);
                        return;
                      }
                      
                      // Proxy the image URL to avoid CORS issues
                      const isExternalUrl = url.startsWith('http') && !url.startsWith('/api/proxy-image');
                      const proxiedUrl = isExternalUrl 
                        ? getProxiedImageUrl(url)
                        : url;
                        
                      console.log('[ChatInput] Original image URL:', url);
                      console.log('[ChatInput] Proxied URL (if applicable):', proxiedUrl);
                      
                      // Check if the image loads through the proxy before adding to canvas
                      await new Promise<void>((resolve, reject) => {
                        const preloadImg = new Image();
                        preloadImg.onload = () => {
                          // Add the proxied image to canvas once it preloads
                          addImage(proxiedUrl, 20 + (i * 400), 20);
                          console.log('[ChatInput] Image added to canvas');
                          resolve();
                        };
                        preloadImg.onerror = () => {
                          console.error('[ChatInput] Failed to preload image through proxy:', proxiedUrl);
                          if (isExternalUrl) {
                            // Try the original URL as fallback
                            addImage(url, 20 + (i * 400), 20);
                            console.log('[ChatInput] Falling back to direct URL');
                          }
                          resolve(); // Still resolve to continue with other images
                        };
                        preloadImg.src = proxiedUrl;
                      });
                    } catch (err) {
                      console.error('[ChatInput] Error adding image to canvas:', err);
                    }
                  }));
                  
                  console.log('[ChatInput] Output event (image added to canvas, not chat):', data.content);
                } else {
                  addMessage({
                    type: 'agentOutput',
                    content: data.content
                  });
                  console.log('[ChatInput] Output event (no image):', data.content);
                }
              }
            } catch (error) {
              console.error('[ChatInput] Error parsing server message:', error);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[ChatInput] Error during image generation:', error);
      
      addMessage({
        type: 'agentOutput',
        content: `Error: ${error.message || 'Failed to generate image'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AIInputWithSearch
      placeholder="Ask Popmint..."
      onSubmit={handleSubmit}
      disabled={isLoading}
      className="shadow-[0px_1px_3px_#00000026,0px_0px_0.5px_#0000004c] bg-white rounded-[10px]"
    />
  );
}
