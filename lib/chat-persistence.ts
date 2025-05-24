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
    console.log('[ChatPersistence] 🔍 DEBUG: Saving message:', {
      projectId,
      messageId: message.id,
      role: message.role,
      contentLength: message.content.length,
      type: message.type,
      isTemporary: message.isTemporary,
    });

    const apiMessage = messageToApiFormat(message);
    console.log('[ChatPersistence] 🔍 DEBUG: Converted to API format:', {
      role: apiMessage.role,
      message_type: apiMessage.message_type,
      content_length: apiMessage.content.length,
      image_urls_count: apiMessage.image_urls?.length || 0,
    });

    const response = await apiCall<{ message: any }>(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify(apiMessage),
    });

    console.log('[ChatPersistence] 🔍 DEBUG: API response received:', {
      success: !!response.message,
      messageId: response.message?.id,
    });

    const serverMessage = apiMessageToStoreFormat(response.message);

    // Map local ID to server ID
    localToServerIdMap.set(message.id, serverMessage.id);

    console.log('[ChatPersistence] ✅ Message saved successfully:', {
      localId: message.id,
      serverId: serverMessage.id,
      timestamp: serverMessage.timestamp,
    });
    return serverMessage;

  } catch (error) {
    console.error('[ChatPersistence] 💥 ERROR saving message:', {
      projectId,
      messageId: message.id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

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
        console.log('[ChatPersistence] 🔔 Store subscription triggered');
        console.log('[ChatPersistence] 📊 Current messages count:', currentMessages?.length || 0);
        console.log('[ChatPersistence] 📊 Previous messages count:', previousMessages?.length || 0);

        // Skip if persistence is disabled or not initialized
        if (!config.enabled || !config.projectId) {
          console.log('[ChatPersistence] ⏸️ Skipping - persistence disabled or no project ID:', { enabled: config.enabled, projectId: config.projectId });
          return;
        }

        if (!isInitialized) {
          console.log('[ChatPersistence] ⏸️ Skipping - middleware not initialized yet');
          return;
        }

        // Find new messages (messages that weren't in the previous state)
        const newMessages = currentMessages.filter(
          (current) => !previousMessages.some((prev) => prev.id === current.id)
        );

        // Save each new message
        for (const message of newMessages) {
          console.log('[ChatPersistence] 🔍 Processing message:', {
            id: message.id,
            role: message.role,
            type: message.type,
            isTemporary: message.isTemporary,
            contentLength: message.content.length,
          });

          // Skip if this is a temporary message
          if (message.isTemporary) {
            console.log('[ChatPersistence] ⏭️ Skipping temporary message:', message.id);
            continue;
          }

          // Skip if this message already has a server ID (UUID format)
          const isServerMessage = message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          if (isServerMessage) {
            console.log('[ChatPersistence] ⏭️ Skipping server message (already persisted):', message.id);
            continue;
          }

          try {
            console.log('[ChatPersistence] 💾 Attempting to save new message:', {
              id: message.id,
              type: message.type,
              role: message.role,
            });
            const serverMessage = await saveChatMessage(config.projectId, message);

            if (serverMessage) {
              // Replace the local message with the server message
              chatStore.getState().updateMessage(message.id, {
                id: serverMessage.id,
                timestamp: serverMessage.timestamp,
              });
              console.log('[ChatPersistence] ✅ Message saved and updated in store:', {
                oldId: message.id,
                newId: serverMessage.id,
              });
            } else {
              console.error('[ChatPersistence] ❌ Failed to save message (null returned):', message.id);
            }
          } catch (error) {
            console.error('[ChatPersistence] 💥 Exception while saving message:', {
              messageId: message.id,
              error: error instanceof Error ? error.message : error,
            });
            // The message will be retried via the offline queue
          }
        }
      }
    );

    // Return initialization function
    return {
      initialize: () => {
        isInitialized = true;
        console.log('[ChatPersistence] 🚀 Middleware initialized for project:', config.projectId);
        console.log('[ChatPersistence] 🔧 Config:', { enabled: config.enabled, projectId: config.projectId });
        console.log('[ChatPersistence] 📡 Subscription active, waiting for message changes...');
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
    console.log('[ChatPersistence] 💾 Starting chat store hydration for project:', projectId);

    const messages = await loadChatMessages(projectId);
    console.log(`[ChatPersistence] 📥 Loaded ${messages.length} messages from server`);

    if (messages.length === 0) {
      console.log('[ChatPersistence] ✅ No messages to hydrate, chat store ready');
      return true;
    }

    // Validate message format before setting
    const validMessages = messages.filter(msg => {
      if (!msg.id || !msg.role || !msg.content) {
        console.warn('[ChatPersistence] ⚠️ Invalid message format, skipping:', msg);
        return false;
      }
      return true;
    });

    console.log(`[ChatPersistence] ✅ Validated ${validMessages.length}/${messages.length} messages`);

    // Use setMessages to avoid triggering persistence middleware during hydration
    // The middleware should already be initialized at this point
    chatStore.getState().setMessages(validMessages);

    console.log('[ChatPersistence] 🎉 Chat store hydrated successfully');
    return true;

  } catch (error) {
    console.error('[ChatPersistence] 💥 Error hydrating chat store:', error);

    // Try to set empty messages array to ensure store is in a valid state
    try {
      chatStore.getState().setMessages([]);
      console.log('[ChatPersistence] 🔄 Set empty messages array as fallback');
    } catch (fallbackError) {
      console.error('[ChatPersistence] 💥 Failed to set fallback empty messages:', fallbackError);
    }

    return false;
  }
}
