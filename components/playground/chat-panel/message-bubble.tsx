import type { ChatMessage } from "@/store/chatStore"
import { useState, useEffect } from "react"

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "userInput"
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [imagesLoaded, setImagesLoaded] = useState(0)
  
  // Log for debugging - with a more visible format for important messages
  console.log(`📩 [MessageBubble] Received message: type=${message.type}, subType=${message.subType || 'none'}, hasImages=${!!message.imageUrls?.length}`);
  if (message.imageUrls?.length) {
    console.log(`🖼️ [MessageBubble] Message contains ${message.imageUrls.length} images:`, message.imageUrls);
  }

  // Handler for image errors
  const handleImageError = (imageUrl: string) => {
    console.error(`🔴 [MessageBubble] Failed to load image: ${imageUrl}`);
    setImageErrors(prev => ({
      ...prev,
      [imageUrl]: true
    }));
  };

  // Handler for image load success
  const handleImageLoad = (imageUrl: string) => {
    console.log(`🟢 [MessageBubble] Successfully loaded image: ${imageUrl}`);
    setImagesLoaded(prev => prev + 1);
  };

  // Track image loading
  useEffect(() => {
    if (message.imageUrls?.length && imagesLoaded === message.imageUrls.length) {
      console.log(`✅ [MessageBubble] All ${imagesLoaded} images loaded successfully for message ${message.id}`);
    }
  }, [imagesLoaded, message.imageUrls, message.id]);

  // Determine if this is an image message - either by subType or by having imageUrls
  const isImageMessage = message.subType === 'image_generated' || 
                        (message.imageUrls && message.imageUrls.length > 0);

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-2 w-full mb-4`}>
      {/* Agent header (only for non-user messages) */}
      {!isUser && (
        <div className="flex items-center gap-1 mb-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center">
            <img src="/popmint_logo.svg" alt="Popmint Logo" className="w-4 h-4" />
          </div>
          <div className="font-medium text-black text-sm">Popmint</div>
          <div className="font-normal text-neutral-400 text-xs">Just now</div>
        </div>
      )}

      {/* Message bubble */}
      <div 
        className={`flex flex-col gap-2 px-4 py-3 rounded-[10px] max-w-3xl shadow-sm
          ${isUser 
            ? "bg-blue-50 text-neutral-800" 
            : message.type === "agentProgress" 
              ? "bg-gray-50 text-neutral-600 italic" 
              : isImageMessage
                ? "bg-white border border-blue-100 text-neutral-800" 
                : "bg-white border border-gray-100 text-neutral-800"
          }`}
      >
        {/* Message content */}
        <div className="whitespace-pre-line text-sm font-medium">
          {message.content}
        </div>
        
        {/* Images (if any) */}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2">
            {message.imageUrls.map((imageUrl, index) => (
              <div key={`${message.id || index}-img-${index}`} className="relative">
                <img 
                  src={imageUrl} 
                  alt={`${isUser ? 'Uploaded' : 'Generated'} image ${index + 1}`}
                  className="max-w-full h-auto max-h-80 object-contain rounded-md border border-gray-200"
                  onLoad={() => handleImageLoad(imageUrl)}
                  onError={() => handleImageError(imageUrl)}
                />
                {imageErrors[imageUrl] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-500 text-xs">Failed to load image</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Images added to canvas confirmation - show for any message with images */}
      {!isUser && isImageMessage && message.imageUrls && message.imageUrls.length > 0 && (
        <div className="font-medium text-green-600 text-xs mt-1">
          ✓ Images added to canvas
        </div>
      )}
    </div>
  )
}
