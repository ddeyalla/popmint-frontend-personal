import type { ChatMessage, MessageType } from "@/store/chatStore"
import { useState, useEffect } from "react"
import { User, Clock, Store, AlertCircle, Bot, ShoppingBag } from "lucide-react"

interface MessageBubbleProps {
  message: ChatMessage
}

const getBubbleStyles = (messageType: MessageType, content: string, subType?: string) => {
  const baseStyles = "flex flex-col rounded-lg p-4 break-words max-w-[80%] text-sm";
  
  // Check for ad-specific content
  const isAdRelated = subType === 'ad_concept' || 
                      content.toLowerCase().includes('ad generation') || 
                      content.toLowerCase().includes('ad concept') ||
                      (messageType === "userInput" && content.toLowerCase().startsWith('/ad'));
  
  switch (messageType) {
    case "userInput":
      return `${baseStyles} bg-blue-500 text-white ml-auto`;
    case "agentRequest":
      return `${baseStyles} bg-neutral-100 text-neutral-900 mr-auto`;
    case "agentProgress":
      return isAdRelated 
        ? `${baseStyles} bg-green-50 text-green-700 mr-auto border border-green-200`
        : `${baseStyles} bg-gray-100 text-gray-700 mr-auto border border-gray-200`;
    case "agentHandover":
      return `${baseStyles} bg-amber-100 text-amber-700 mr-auto`;
    case "agentOutput":
      return isAdRelated
        ? `${baseStyles} bg-green-50 text-green-800 mr-auto border border-green-200`
        : `${baseStyles} bg-green-50 text-green-900 mr-auto border border-green-100`;
    case "agentUpdate":
      return `${baseStyles} bg-purple-50 text-purple-900 mr-auto border border-purple-100`;
    default:
      return `${baseStyles} bg-neutral-100 text-neutral-900 mr-auto`;
  }
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.type === "userInput"
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [imagesLoaded, setImagesLoaded] = useState(0)
  const [hovered, setHovered] = useState(false);
  
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

  // Check if this is ad-related content
  const isAdRelated = message.subType === 'ad_concept' || 
                      message.content.toLowerCase().includes('ad generation') ||
                      message.content.toLowerCase().includes('analyzing product') ||
                      (isUser && message.content.toLowerCase().startsWith('/ad'));

  const getIcon = (messageType: MessageType, content: string, subType?: string) => {
    if (messageType === "userInput") {
      return <User className="h-4 w-4 text-white" />;
    }
    
    if (messageType === "agentProgress") {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
    
    if (messageType === "agentHandover") {
      return <AlertCircle className="h-4 w-4 text-amber-400" />;
    }
    
    // Check for ad-related content
    if (subType === "ad_concept" || (content.toLowerCase().includes('ad') && content.toLowerCase().includes('product'))) {
      return <Store className="h-4 w-4 text-emerald-600" />;
    }
    
    return <Bot className="h-4 w-4 text-green-600" />;
  };

  return (
    <div className="flex items-start gap-3">
      {isUser ? (
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center mt-0.5 order-2 ml-2">
          {getIcon(message.type, message.content, message.subType)}
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mt-0.5">
          {message.type === "agentProgress" ? (
            isAdRelated ? (
              <Store className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
            )
          ) : isAdRelated ? (
            <ShoppingBag className="w-3.5 h-3.5 text-green-600" />
          ) : message.content.toLowerCase().includes('error') ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          ) : (
            getIcon(message.type, message.content, message.subType)
          )}
        </div>
      )}

      <div className={getBubbleStyles(message.type, message.content, message.subType)}>
        {/* Messages with images */}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="grid grid-cols-1 gap-4 mb-2">
            {message.imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Generated image ${index + 1}`}
                className="rounded-md max-h-[200px] w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-image.svg';
                }}
              />
            ))}
          </div>
        )}

        {/* Show ad-specific styling for ad related content */}
        {isAdRelated && !isUser && (
          <div className="bg-green-100 rounded-sm px-2 py-1 text-xs text-green-800 mb-2 inline-flex items-center font-medium">
            <Store className="w-3 h-3 mr-1" />
            Ad Generator
          </div>
        )}

        {/* Show ad command indicator for user messages */}
        {isAdRelated && isUser && (
          <div className="bg-blue-600 rounded-sm px-2 py-1 text-xs text-white mb-2 inline-flex items-center font-medium self-start">
            <Store className="w-3 h-3 mr-1" />
            Ad Command
          </div>
        )}

        {/* Main text content */}
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Show duration for completed messages */}
        {message.duration && message.status === "completed" && (
          <div className="text-xs text-right mt-2 opacity-70 flex items-center justify-end gap-1">
            <Clock className="w-3 h-3" />
            <span>{message.duration}</span>
          </div>
        )}
      </div>
    </div>
  )
}
