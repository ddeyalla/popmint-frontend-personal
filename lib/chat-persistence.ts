// Chat persistence middleware for Zustand store

import { ChatMessage } from '@/store/chatStore';
import { apiCall, withRetry, offlineQueue } from '@/lib/persistence-utils';

export interface ChatPersistenceConfig {
  projectId: string;
  enabled: boolean;
}

// Map local message IDs to server IDs
const localToServerIdMap = new Map<string, string>();

// Track messages that have been successfully saved to avoid duplicates
const savedMessageIds = new Set<string>();

/**
 * Determine if a message type should be persisted
 */
function shouldPersistMessage(message: ChatMessage): boolean {
  // Don't persist temporary messages
  if (message.isTemporary) {
    return false;
  }

  // Don't persist complex UI-only message types that can't be properly restored
  const nonPersistableTypes = [
    'ad_generation',      // Too complex, loses adData
    'agent_bubble',       // Too complex, loses agentData
    'temporary_status',   // Temporary by nature
    'ad_step_complete',   // Temporary progress indicator
    'agent_progress'      // Temporary progress indicator
  ];

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
// Track in-flight message saves to prevent duplicates
const inProgressSaves = new Map<string, Promise<ChatMessage | null>>();

/**
 * Clear saved message IDs when store is cleared
 * Called externally from chatStore when clearMessages is invoked
 */
export function clearSavedMessageTracking() {
  console.log('[ChatPersistence] 🧹 Clearing saved message tracking');
  savedMessageIds.clear();
}

export async function saveChatMessage(
  projectId: string,
  message: ChatMessage
): Promise<ChatMessage | null> {
  // Create a unique key for this message to prevent duplicate API calls
  const messageKey = `${projectId}-${message.id}-${message.content.substring(0, 50)}`;
  
  // If this exact message is already being saved, return the existing promise
  if (inProgressSaves.has(messageKey)) {
    console.log('[ChatPersistence] 🔄 Duplicate save request detected, returning existing promise for:', messageKey);
    const existingPromise = inProgressSaves.get(messageKey);
    return existingPromise || null; // Ensure we return ChatMessage | null, not undefined
  }

  // Create a promise for this save operation
  const savePromise = (async () => {
    try {
      console.log('[ChatPersistence] 🔍 DEBUG: Saving message:', {
        projectId,
        messageId: message.id,
        role: message.role,
        contentLength: message.content.length,
        type: message.type,
        isTemporary: message.isTemporary,
      });

      // Verify project exists or create it before attempting to save messages
      // This ensures we don't repeatedly try to save messages to non-existent projects
      let projectExists = false;
      
      try {
        console.log(`[ChatPersistence] 🔍 Checking if project exists: ${projectId}`);
        
        // First try a HEAD request which is lightweight
        const projectResponse = await fetch(`/api/projects/${projectId}`, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        // If status is 200, project exists
        if (projectResponse.ok) {
          console.log(`[ChatPersistence] ✓ Project ${projectId} exists`);
          projectExists = true;
        } 
        // If 404, try to create it
        else if (projectResponse.status === 404) {
          console.log(`[ChatPersistence] ⚠️ Project ${projectId} does not exist - attempting to create it`);
          
          // Auto-create the project
          const createResponse = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: projectId,
              name: 'Auto-created Project',
              description: 'Automatically created to fix persistence issue'
            })
          });
          
          if (createResponse.ok) {
            console.log(`[ChatPersistence] ✅ Successfully created project ${projectId}`);
            projectExists = true;
            
            // Add a small delay to ensure the project is fully created in the backend
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            const errorText = await createResponse.text().catch(() => 'No error details');
            console.error(`[ChatPersistence] ❌ Failed to create project: ${createResponse.status}`, errorText);
            // Don't try to save if we can't create the project
            return null;
          }
        }
        // Other status codes (like 500) indicate a server issue
        else {
          console.error(`[ChatPersistence] ❌ Unexpected response when checking project: ${projectResponse.status}`);
          // For server errors (5xx), it might work on retry after server recovers
          if (projectResponse.status >= 500 && projectResponse.status < 600) {
            console.log(`[ChatPersistence] 🔄 Server error (${projectResponse.status}), will try again later`);
            // Will continue to save attempt, and get added to offline queue if it fails
          } else {
            // For other status codes, don't continue
            return null;
          }
        }
      } catch (error) {
        console.error(`[ChatPersistence] 💥 Error checking/creating project:`, error);
        // Only continue if it's a network error that might resolve on retry
        // Don't add to retry queue for other errors
        if (error instanceof TypeError && error.message.includes('network')) {
          console.log(`[ChatPersistence] ⚠️ Network error - will try again later`);
          // Will continue to save attempt, and get added to offline queue if it fails
        } else {
          return null;
        }
      }
      
      // Skip save if project doesn't exist and couldn't be created
      if (!projectExists) {
        console.log(`[ChatPersistence] ⏭️ Skipping message save - project issues must be resolved first`);
        return null;
      }

      const apiMessage = messageToApiFormat(message);
      console.log('[ChatPersistence] 🔍 DEBUG: Converted to API format:', {
        role: apiMessage.role,
        message_type: apiMessage.message_type,
        content_length: apiMessage.content.length,
        image_urls_count: apiMessage.image_urls?.length || 0,
      });

      // Add content hash for deduplication
      const contentHash = typeof window !== 'undefined' ? 
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message.content + message.role))
          .then(hash => Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')) :
        '';  // Fallback for non-browser environments
      
      const fullApiMessage = {
        ...apiMessage,
        content_hash: contentHash
      };

      // Use retry for network resilience
      const response = await withRetry(
        () => apiCall<{ message: any }>(`/api/projects/${projectId}/chat`, {
          method: 'POST',
          body: JSON.stringify(fullApiMessage),
        })
      );

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

      // Only add to offline queue for non-fatal errors (like network issues)
      // that have a chance of succeeding on retry
      if (error instanceof TypeError || 
          (error instanceof Error && error.message.includes('network'))) {
        console.log('[ChatPersistence] 🔄 Adding to offline queue for retry');
        offlineQueue.add(() => saveChatMessage(projectId, message));
      }

      return null;
    } finally {
      // Clean up the in-flight save regardless of success/failure
      inProgressSaves.delete(messageKey);
      
      // Mark this message as saved to prevent duplicates, regardless of success/error
      // This ensures we don't retry indefinitely and create many duplicates
      savedMessageIds.add(message.id);
    }
  })();

  // Store the promise
  inProgressSaves.set(messageKey, savePromise);
  return savePromise;
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
  // Hook into store's message clear to reset tracking
  const clearTracking = () => {
    savedMessageIds.clear();
    console.log('[ChatPersistence] 🧹 Cleared saved message tracking due to store reset');
  };
  let isInitialized = false;

  return (chatStore: any) => {
    // Hook into clearMessages to reset tracking
    const originalClearMessages = chatStore.getState().clearMessages;
    if (originalClearMessages) {
      chatStore.getState().clearMessages = () => {
        originalClearMessages();
        clearTracking();
      };
    }
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

        // Filter messages that need to be saved (exclude temporary, non-persistable, server or already-saved)
        const messagesToSave = newMessages.filter(message => {
          if (savedMessageIds.has(message.id)) {
            console.log('[ChatPersistence] ⏭️ Skipping already-saved message:', message.id);
            return false;
          }
          if (!shouldPersistMessage(message)) {
            return false;
          }
          const isServerMessage = message.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          if (isServerMessage) {
            console.log('[ChatPersistence] ⏭️ Skipping server message (already persisted):', message.id);
            return false;
          }
          return true;
        });

        console.log('[ChatPersistence] 🔍 Messages to save after filtering:', messagesToSave.length);

        // REMOVED: debounced sync to prevent duplicate saves
        if (messagesToSave.length > 0) {
          console.log('[ChatPersistence] 🔄 Processing new messages for save (count: ' + messagesToSave.length + ')');
          // We'll use direct saves below instead of the debounced approach
          // This prevents multiple save paths for the same messages
        }

        // UPDATED: Use direct saves only - no debounced or optimistic updates
        // This ensures each message is saved exactly once
        for (const message of messagesToSave) {
          console.log('[ChatPersistence] 🔍 Processing message for save:', {
            id: message.id,
            role: message.role,
            type: message.type,
            contentLength: message.content.length,
          });

          try {
            console.log('[ChatPersistence] 💾 Attempting to save message:', {
              id: message.id,
              type: message.type,
              role: message.role,
              contentHash: typeof window !== 'undefined' ? 
                await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message.content.substring(0, 100) + message.role))
                  .then(hash => Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('').substring(0, 8)) : 'none',
            });

            // Use traditional save to avoid conflicts with SWR
            const serverMessage = await saveChatMessage(config.projectId, message);

            if (serverMessage) {
              // Mark this message as saved to prevent future duplicates
              savedMessageIds.add(message.id);
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
            // Add to offline queue for retry
            offlineQueue.add(() => saveChatMessage(config.projectId, message));
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
    console.log('[ChatPersistence] Hydrating chat store for project:', projectId);

    // First, check if we already have messages to avoid duplicates
    const currentMessages = chatStore.getState().messages || [];
    if (currentMessages.length > 0) {
      console.log('[ChatPersistence] Chat store already has messages, skipping hydration to prevent duplicates');
      return true;
    }

    const messages = await loadChatMessages(projectId);

    if (messages.length === 0) {
      console.log('[ChatPersistence] No messages found for project');
      return true;
    }

    console.log(`[ChatPersistence] Loaded ${messages.length} messages from server`);

    // Create a map of existing messages to prevent duplicates
    const existingMessagesMap = new Map<string, boolean>();
    currentMessages.forEach((msg: ChatMessage) => existingMessagesMap.set(msg.id, true));
    
    // Filter out any duplicates that might exist
    const uniqueMessages = messages.filter(msg => !existingMessagesMap.has(msg.id));
    
    console.log(`[ChatPersistence] After deduplication: ${uniqueMessages.length} unique messages`);

    // Validate message format before setting
    const validMessages = uniqueMessages.filter(msg => {
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
