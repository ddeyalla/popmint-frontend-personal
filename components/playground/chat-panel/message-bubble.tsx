import type { ChatMessage } from "@/store/chatStore"
import { useState } from "react"

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "userInput"
  const [imageFailed, setImageFailed] = useState(false)
  
  console.log('Rendering message bubble:', message.type, 'Has images:', !!message.imageUrls?.length);

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
              : "bg-white border border-gray-100 text-neutral-800"
          }`}
      >
        {/* Message content */}
        <div className="whitespace-pre-line text-sm font-medium">
          {message.content}
        </div>
        
        {/* Debug info */}
        <div className="text-xs text-gray-400 mt-1">
          {JSON.stringify({type: message.type, hasImages: !!message.imageUrls?.length})}
        </div>
        
        {/* Images (if any) - Only for test/user-uploaded images, not DALL-E */}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2">
            {message.imageUrls.map((imageUrl, index) => (
              <div key={`${message.id || index}-img-${index}`} className="relative">
                <img 
                  src={imageUrl} 
                  alt={`${isUser ? 'Uploaded' : 'Generated'} image ${index + 1}`}
                  className="max-w-full h-auto max-h-80 object-contain rounded-md border border-gray-200"
                  onLoad={() => console.log('Image loaded:', imageUrl)}
                  onError={(e) => {
                    console.error('Failed to load image:', imageUrl);
                    setImageFailed(true);
                  }}
                />
                {imageFailed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-500 text-xs">Failed to load image</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Images added to canvas confirmation */}
      {!isUser && message.imageUrls && message.imageUrls.length > 0 && (
        <div className="font-medium text-green-600 text-xs mt-1">
          ✓ Images added to canvas
        </div>
      )}
    </div>
  )
}
