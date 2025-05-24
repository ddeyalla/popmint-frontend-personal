// Chat persistence middleware for Zustand store

import { ChatMessage } from '@/store/chatStore';
import { apiCall, withRetry, offlineQueue } from '@/lib/persistence-utils';

export interface ChatPersistenceConfig {
  projectId: string;
  enabled: boolean;
}

// Map local message IDs to server IDs
const localToServerIdMap = new Map<string, string>();

/**
 * Convert a local chat message to the format expected by the API
 */
function messageToApiFormat(message: ChatMessage) {
  return {
    role: message.role,
    content: message.content,
    image_urls: message.imageUrls || [],
    message_type: message.type || 'text',
  };
}

/**
 * Convert an API message to the format expected by the chat store
 */
function apiMessageToStoreFormat(apiMessage: any): ChatMessage {
  return {
    id: apiMessage.id,
    role: apiMessage.role,
    type: apiMessage.message_type || 'text',
    content: apiMessage.content,
    timestamp: new Date(apiMessage.created_at),
    imageUrls: apiMessage.image_urls || [],
  };
}

/**
 * Save a chat message to the server
 */
export async function saveChatMessage(
  projectId: string,
  message: ChatMessage
): Promise<ChatMessage | null> {
  try {
    console.log('[ChatPersistence] Saving message:', message.id);

    const response = await apiCall<{ message: any }>(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify(messageToApiFormat(message)),
    });

    const serverMessage = apiMessageToStoreFormat(response.message);

    // Map local ID to server ID
    localToServerIdMap.set(message.id, serverMessage.id);

    console.log('[ChatPersistence] Message saved successfully:', serverMessage.id);
    return serverMessage;

  } catch (error) {
    console.error('[ChatPersistence] Error saving message:', error);

    // Add to offline queue for retry
    offlineQueue.add(() => saveChatMessage(projectId, message));

    return null;
  }
}

/**
 * Load all chat messages for a project
 */
export async function loadChatMessages(projectId: string): Promise<ChatMessage[]> {
  try {
    console.log('[ChatPersistence] Loading messages for project:', projectId);

    const response = await apiCall<{ messages: any[] }>(`/api/projects/${projectId}/chat`);

    const messages = response.messages.map(apiMessageToStoreFormat);

    console.log(`[ChatPersistence] Loaded ${messages.length} messages`);
    return messages;

  } catch (error) {
    console.error('[ChatPersistence] Error loading messages:', error);
    return [];
  }
}

/**
 * Create persistence middleware for chat store
 */
export function createChatPersistenceMiddleware(config: ChatPersistenceConfig) {
  let isInitialized = false;

  return (chatStore: any) => {
    // Subscribe to message changes
    chatStore.subscribe(
      (state: any) => state.messages,
      async (currentMessages: ChatMessage[], previousMessages: ChatMessage[]) => {
        // Skip if persistence is disabled or not initialized
        if (!config.enabled || !config.projectId || !isInitialized) {
          return;
        }

        // Find new messages (messages that weren't in the previous state)
        const newMessages = currentMessages.filter(
          (current) => !previousMessages.some((prev) => prev.id === current.id)
        );

        // Save each new message
        for (const message of newMessages) {
          // Skip if this is a temporary message or already has a server ID
          if (message.isTemporary || !message.id.startsWith('local-')) {
            continue;
          }

          try {
            const serverMessage = await saveChatMessage(config.projectId, message);

            if (serverMessage) {
              // Replace the local message with the server message
              chatStore.getState().updateMessage(message.id, {
                id: serverMessage.id,
                timestamp: serverMessage.timestamp,
              });
            }
          } catch (error) {
            console.error('[ChatPersistence] Failed to save message:', error);
            // The message will be retried via the offline queue
          }
        }
      }
    );

    // Return initialization function
    return {
      initialize: () => {
        isInitialized = true;
        console.log('[ChatPersistence] Middleware initialized for project:', config.projectId);
      },

      disable: () => {
        isInitialized = false;
        console.log('[ChatPersistence] Middleware disabled');
      },

      updateConfig: (newConfig: Partial<ChatPersistenceConfig>) => {
        Object.assign(config, newConfig);
        console.log('[ChatPersistence] Config updated:', config);
      },
    };
  };
}

/**
 * Hydrate chat store with messages from server
 */
export async function hydrateChatStore(
  chatStore: any,
  projectId: string
): Promise<boolean> {
  try {
    console.log('[ChatPersistence] Hydrating chat store for project:', projectId);

    const messages = await loadChatMessages(projectId);

    // Use setMessages to avoid triggering persistence middleware
    chatStore.getState().setMessages(messages);

    console.log('[ChatPersistence] Chat store hydrated successfully');
    return true;

  } catch (error) {
    console.error('[ChatPersistence] Error hydrating chat store:', error);
    return false;
  }
}
