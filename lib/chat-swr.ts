// SWR-based chat data fetching and synchronization

import useSWR, { mutate } from 'swr';
import { ChatMessage } from '@/store/chatStore';
import { apiCall } from '@/lib/persistence-utils';

/**
 * Fetcher function for SWR
 */
const chatFetcher = async (url: string): Promise<ChatMessage[]> => {
  try {
    const response = await apiCall<{ messages: any[] }>(url);

    // Convert API messages to store format
    const messages = response.messages.map(apiMessage => ({
      id: apiMessage.id,
      role: apiMessage.role as 'user' | 'assistant',
      type: apiMessage.message_type || 'text',
      content: apiMessage.content,
      timestamp: new Date(apiMessage.created_at),
      imageUrls: apiMessage.image_urls || [],
    }));

    return messages;
  } catch (error) {
    console.error('[ChatSWR] Error fetching messages:', error);
    throw error;
  }
};

/**
 * SWR hook for chat messages
 */
export function useChatMessages(projectId: string | null) {
  const {
    data: messages,
    error,
    isLoading,
    isValidating,
    mutate: revalidate
  } = useSWR(
    projectId ? `/api/projects/${projectId}/chat` : null,
    chatFetcher,
    {
      // Revalidate on focus to ensure fresh data
      revalidateOnFocus: true,

      // Revalidate on reconnect
      revalidateOnReconnect: true,

      // Don't revalidate on mount if we have data
      revalidateIfStale: false,

      // Retry on error
      errorRetryCount: 3,
      errorRetryInterval: 1000,

      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,

      // Keep data fresh
      refreshInterval: 0, // Disable automatic refresh

      // Fallback data
      fallbackData: [],
    }
  );

  return {
    messages: messages || [],
    error,
    isLoading,
    isValidating,
    revalidate,
    isEmpty: !isLoading && !error && (!messages || messages.length === 0),
  };
}

/**
 * Optimistically update chat messages
 */
export async function optimisticUpdateChat(
  projectId: string,
  newMessage: ChatMessage,
  shouldRevalidate = true
) {
  const key = `/api/projects/${projectId}/chat`;

  try {
    // Optimistically update the cache
    await mutate(
      key,
      async (currentMessages: ChatMessage[] = []) => {
        return [...currentMessages, newMessage];
      },
      false // Don't revalidate immediately
    );

    // Save to server
    const response = await apiCall<{ message: any }>(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        role: newMessage.role,
        content: newMessage.content,
        image_urls: newMessage.imageUrls || [],
        message_type: newMessage.type || 'text',
      }),
    });

    // Update with server response
    if (shouldRevalidate) {
      await mutate(key);
    }

    return response.message;
  } catch (error) {
    // Revert optimistic update on error
    await mutate(key);
    throw error;
  }
}

/**
 * Batch update multiple messages
 */
export async function batchUpdateChat(
  projectId: string,
  messages: ChatMessage[]
) {
  const key = `/api/projects/${projectId}/chat`;

  try {
    // For now, we'll save messages individually
    // In the future, we could implement a batch API endpoint
    const promises = messages.map(message =>
      apiCall<{ message: any }>(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          role: message.role,
          content: message.content,
          image_urls: message.imageUrls || [],
          message_type: message.type || 'text',
        }),
      })
    );

    await Promise.all(promises);

    // Revalidate after batch update
    await mutate(key);
  } catch (error) {
    console.error('[ChatSWR] Batch update failed:', error);
    throw error;
  }
}

/**
 * Clear chat cache for a project
 */
export function clearChatCache(projectId: string) {
  const key = `/api/projects/${projectId}/chat`;
  mutate(key, undefined, false);
}

/**
 * Preload chat messages for a project
 */
export function preloadChatMessages(projectId: string) {
  const key = `/api/projects/${projectId}/chat`;
  mutate(key, chatFetcher(key), false);
}

/**
 * Get cached chat messages without triggering a request
 * Note: This is a simplified implementation. In a real app, you'd use SWR's cache API
 */
export function getCachedChatMessages(projectId: string): ChatMessage[] | undefined {
  // For now, return undefined since we can't easily access SWR cache
  // This function would be used for optimizations, but it's not critical
  return undefined;
}

/**
 * Debounced sync function for batching rapid updates
 */
let syncTimeout: NodeJS.Timeout | null = null;
const pendingUpdates = new Map<string, ChatMessage[]>();

export function debouncedSyncChat(
  projectId: string,
  messages: ChatMessage[],
  delay = 500
) {
  // Store pending updates
  pendingUpdates.set(projectId, messages);

  // Clear existing timeout
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  // Set new timeout
  syncTimeout = setTimeout(async () => {
    const updates = Array.from(pendingUpdates.entries());
    pendingUpdates.clear();

    // Process all pending updates
    for (const [pid, msgs] of updates) {
      try {
        await batchUpdateChat(pid, msgs);
      } catch (error) {
        console.error(`[ChatSWR] Failed to sync messages for project ${pid}:`, error);
      }
    }

    syncTimeout = null;
  }, delay);
}
