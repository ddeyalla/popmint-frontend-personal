// Chat persistence middleware for Zustand store

import { ChatMessage } from '@/store/chatStore';
import { apiCall, offlineQueue } from '@/lib/persistence-utils';
import { debouncedSyncChat } from '@/lib/chat-swr';
import { mutate } from 'swr';

// Debug flag for persistence logging - can be controlled via environment variable
const DEBUG_PERSISTENCE = process.env.NODE_ENV === 'development' || process.env.DEBUG_PERSISTENCE === 'true';

/**
 * Debug logging function with proper typing
 * Only logs in development mode or when DEBUG_PERSISTENCE is explicitly enabled
 */
function debugLog(...args: any[]): void {
  if (DEBUG_PERSISTENCE) {
    console.log('[ChatPersistence DEBUG]', ...args);
  }
}

/**
 * Analyze message persistability for debugging
 */
export function analyzeMessagePersistability(messages: ChatMessage[]): {
  total: number,
  persistable: number,
  nonPersistable: number,
  byType: Record<string, { total: number, persistable: number }>
} {
  const result = {
    total: messages.length,
    persistable: 0,
    nonPersistable: 0,
    byType: {} as Record<string, { total: number, persistable: number }>
  };

  for (const message of messages) {
    // Initialize type stats if not exists
    const type = message.type || 'unknown';
    if (!result.byType[type]) {
      result.byType[type] = { total: 0, persistable: 0 };
    }

    // Increment total for this type
    result.byType[type].total++;

    // Check persistability
    const isPersistable = shouldPersistMessage(message);

    if (isPersistable) {
      result.persistable++;
      result.byType[type].persistable++;
    } else {
      result.nonPersistable++;
    }
  }

  debugLog('Message persistability analysis:', result);
  return result;
}

export interface ChatPersistenceConfig {
  projectId: string;
  enabled: boolean;
}

// Map local message IDs to server IDs
const localToServerIdMap = new Map<string, string>();

/**
 * Determine if a message type should be persisted
 */
function shouldPersistMessage(message: ChatMessage): boolean {
  // Don't persist temporary messages
  if (message.isTemporary) {
    debugLog('Skipping temporary message:', message.id);
    return false;
  }

  // Don't persist messages without content
  if (!message.content || message.content.trim() === '') {
    debugLog('Skipping message without content:', message.id);
    return false;
  }

  // Only filter truly temporary UI-only message types
  const nonPersistableTypes = [
    'temporary_status',   // Temporary by nature
    'ad_step_complete',   // Temporary progress indicator
    'agent_progress'      // Temporary progress indicator
  ];
  // Removed 'ad_generation' and 'agent_bubble' from non-persistable types

  if (nonPersistableTypes.includes(message.type)) {
    console.log('[ChatPersistence] ⏭️ Skipping non-persistable message type:', message.type);
    return false;
  }

  return true;
}

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

    // Try both API routes for compatibility
    let response;
    try {
      // First try the current implementation route
      response = await apiCall<{ message: any }>(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify(apiMessage),
      });
    } catch (primaryError) {
      console.log('[ChatPersistence] Primary API route failed, trying alternative route');
      // If that fails, try the documented route
      response = await apiCall<{ message: any }>(`/api/chat/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(apiMessage),
      });
    }

    console.log('[ChatPersistence] 🔍 DEBUG: API response received:', {
      success: !!response.message,
      messageId: response.message?.id,
    });

    const serverMessage = apiMessageToStoreFormat(response.message);

    // Map local ID to server ID
    localToServerIdMap.set(message.id, serverMessage.id);

    // Update SWR cache to keep it in sync
    const swrKey = `/api/projects/${projectId}/chat`;
    mutate(swrKey);

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

    // Add to offline queue for retry only if it's a retryable error
    const isRetryable = error instanceof Error &&
      (!('isRetryable' in error) || error.isRetryable !== false);

    if (isRetryable) {
      debugLog('Adding message to offline queue for retry:', message.id);
      offlineQueue.add(() => saveChatMessage(projectId, message));
    } else {
      debugLog('Error is not retryable, skipping offline queue:', message.id);
    }

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
    // Initialize middleware immediately
    isInitialized = true;
    console.log('[ChatPersistence] ✅ Middleware initialized with config:', {
      projectId: config.projectId,
      enabled: config.enabled
    });

    // Subscribe to message changes with debounced sync
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

        // Filter messages that need to be saved
        const messagesToSave = newMessages.filter(message => {
          // Check if message should be persisted (handles temporary and complex types)
          if (!shouldPersistMessage(message)) {
            return false;
          }

          // Skip if this message already has a server ID (UUID format)
          // Improved UUID detection with more precise check
          const isServerMessage = typeof message.id === 'string' &&
            message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
            !message.id.startsWith('local-');

          if (isServerMessage) {
            console.log('[ChatPersistence] ⏭️ Skipping server message (already persisted):', message.id);
            return false;
          }

          return true;
        });

        console.log('[ChatPersistence] 🔍 Messages to save after filtering:', messagesToSave.length);

        // Use debounced sync for better performance and to avoid race conditions
        if (messagesToSave.length > 0) {
          console.log('[ChatPersistence] 🔄 Using debounced sync for new messages');
          debugLog('Messages being queued for debounced sync:', messagesToSave.map(m => ({ id: m.id, type: m.type })));
          debouncedSyncChat(config.projectId, messagesToSave, 500);
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

    // Try both API routes for compatibility
    let messages;
    try {
      messages = await loadChatMessages(projectId);
    } catch (error) {
      console.error('[ChatPersistence] Error loading messages from primary API, trying alternative:', error);

      // Try alternative API route
      const response = await apiCall<{ messages: any[] }>(`/api/chat/${projectId}`);
      messages = response.messages.map(apiMessageToStoreFormat);
    }

    console.log(`[ChatPersistence] 📥 Loaded ${messages.length} messages from server`);

    if (messages.length === 0) {
      console.log('[ChatPersistence] ✅ No messages to hydrate, chat store ready');
      return true;
    }

    // Validate message format before setting
    const validMessages = messages.filter(msg => {
      if (!msg.id || !msg.role || typeof msg.content !== 'string') {
        console.warn('[ChatPersistence] ⚠️ Invalid message format, skipping:', msg);
        debugLog('Invalid message details:', {
          hasId: !!msg.id,
          hasRole: !!msg.role,
          contentType: typeof msg.content,
          message: msg
        });
        return false;
      }

      // Validate role is one of the expected values
      if (!['user', 'assistant'].includes(msg.role)) {
        console.warn('[ChatPersistence] ⚠️ Invalid message role, skipping:', msg.role);
        return false;
      }

      return true;
    });

    console.log(`[ChatPersistence] ✅ Validated ${validMessages.length}/${messages.length} messages`);

    // Use setMessages to avoid triggering persistence middleware during hydration
    chatStore.getState().setMessages(validMessages);

    // Update SWR cache to keep it in sync
    const swrKey = `/api/projects/${projectId}/chat`;
    mutate(swrKey, validMessages, false);

    console.log('[ChatPersistence] 🎉 Chat store hydrated successfully');
    return true;
  } catch (error) {
    // Error handling remains the same
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
