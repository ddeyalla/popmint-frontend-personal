"use client";

import type { ChatMessage } from "@/store/chatStore";
import { User } from "lucide-react";
import Image from "next/image"; // Using next/image for optimization
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * MessageBubble component for displaying simple text messages.
 * Used for basic user/assistant text interactions.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const { role, content, timestamp, imageUrls } = message;
  const isUserMessage = role === "user";

  // Determine avatar based on message role
  const avatar = isUserMessage ? (
    <div className="w-6 h-6 rounded-[10px] bg-blue-500 flex items-center justify-center flex-shrink-0">
      <User className="h-4 w-4 text-white" />
    </div>
  ) : (
    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
      <Image src="/popmint_logo.svg" alt="Popmint Logo" width={16} height={16} />
    </div>
  );

  return (
    <div
      className={cn(
        "flex w-full overflow-x-visible",
        isUserMessage ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex gap-2 max-w-[85%]", // Max width to prevent overly wide bubbles
          isUserMessage ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div className="mt-1">{avatar}</div>

        {/* Message Content Area */}
        <div
          className={cn(
            "rounded-[10px] px-2 py-2 text-[14px] break-words",
            isUserMessage
              ? "bg-slate-100 text-slate-900 rounded-[10px]" // User message style
              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none" // Agent message style
          )}
        >
          {/* Main text content */}
          <p className="whitespace-pre-wrap break-words">{content}</p>

          {/* Image display */}
          {imageUrls && imageUrls.length > 0 && (
            <div className={cn("mt-2", imageUrls.length > 1 ? "grid grid-cols-2 gap-2" : "")}>
              {imageUrls.map((url: string, index: number) => (
                <div key={index} className="relative aspect-square max-w-[150px] max-h-[150px] overflow-hidden rounded-[10px]">
                  <Image
                    src={url}
                    alt={`Attached image ${index + 1}`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                    onError={(e) => {
                      // Fallback for broken images if needed
                      console.error(`Error loading image: ${url}`);
                      // e.currentTarget.src = \'/placeholder-image.png\';
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p
            className={cn(
              "text-xs mt-1.5",
              isUserMessage ? "text-slate-500 opacity-80" : "text-slate-400"
            )}
          >
            {timestamp ? new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }) : 'Now'}
          </p>
        </div>
      </div>
    </div>
  );
}
