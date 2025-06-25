// Auto-initializing persistence system that hooks into stores automatically

import { useChatStore } from '@/store/chatStore';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { saveChatMessage, loadChatMessages } from '@/lib/chat-persistence';
import { saveCanvasObject, updateCanvasObject, deleteCanvasObject, loadCanvasObjects, processImageForStorage } from '@/lib/canvas-persistence';
import { debounce, withRetry, offlineQueue, RetryOptions } from '@/lib/persistence-utils';

// Constants
const CANVAS_DEBOUNCE_DELAY = 300; // 300ms debounce for canvas updates

// Performance metrics
const persistenceMetrics = {
  chatSaveAttempts: 0,
  chatSaveSuccesses: 0,
  canvasSaveAttempts: 0,
  canvasSaveSuccesses: 0,
  lastResetTime: Date.now(),
};

/**
 * Get persistence performance metrics
 */
export function getPersistenceMetrics() {
  const timeSinceReset = Date.now() - persistenceMetrics.lastResetTime;
  return {
    ...persistenceMetrics,
    uptime: timeSinceReset,
    chatSuccessRate: persistenceMetrics.chatSaveAttempts > 0 
      ? (persistenceMetrics.chatSaveSuccesses / persistenceMetrics.chatSaveAttempts * 100).toFixed(2) + '%'
      : 'N/A',
    canvasSuccessRate: persistenceMetrics.canvasSaveAttempts > 0
      ? (persistenceMetrics.canvasSaveSuccesses / persistenceMetrics.canvasSaveAttempts * 100).toFixed(2) + '%' 
      : 'N/A',
  };
}

/**
 * Reset persistence metrics
 */
export function resetPersistenceMetrics() {
  persistenceMetrics.chatSaveAttempts = 0;
  persistenceMetrics.chatSaveSuccesses = 0;
  persistenceMetrics.canvasSaveAttempts = 0;
  persistenceMetrics.canvasSaveSuccesses = 0;
  persistenceMetrics.lastResetTime = Date.now();
}

// Global state
let currentProjectId: string | null = null;
let isPersistenceActive = false;
let chatUnsubscribe: (() => void) | null = null;
let canvasUnsubscribe: (() => void) | null = null;

/**
 * Initialize auto-persistence for a project
 */
export async function initializeAutoPersistence(projectId: string): Promise<boolean> {
  try {
    console.log('[AutoPersistence] 🚀 Initializing for project:', projectId);

    // Clean up existing subscriptions if project changed
    if (currentProjectId !== projectId) {
      disableAutoPersistence();
    }

    currentProjectId = projectId;

    // Set up chat persistence
    await setupChatPersistence(projectId);

    // Set up canvas persistence
    await setupCanvasPersistence(projectId);

    isPersistenceActive = true;
    console.log('[AutoPersistence] ✅ Auto-persistence initialized successfully');

    return true;
  } catch (error) {
    console.error('[AutoPersistence] 💥 Error initializing auto-persistence:', error);
    return false;
  }
}

/**
 * Set up chat persistence with auto-save
 */
async function setupChatPersistence(projectId: string): Promise<void> {
  console.log('[AutoPersistence] 🔧 Setting up chat persistence');

  // Load existing messages with retry
  try {
    const existingMessages = await withRetry(() => loadChatMessages(projectId), {
      maxRetries: 3,
      retryDelay: 1000,
    });
    if (existingMessages.length > 0) {
      console.log(`[AutoPersistence] 📥 Loading ${existingMessages.length} existing chat messages`);
      useChatStore.getState().setMessages(existingMessages);
    }
  } catch (error) {
    console.error('[AutoPersistence] Error loading chat messages:', error);
  }

  // Set up auto-save subscription
  let previousMessages: any[] = [];

  chatUnsubscribe = useChatStore.subscribe(
    (state) => {
      const currentMessages = state.messages;
      
      if (!isPersistenceActive || !currentProjectId) return;

      // Find new messages
      const newMessages = currentMessages.filter(
        (current: any) => !previousMessages.some((prev: any) => prev.id === current.id)
      );

      // Save new messages that should be persisted
      for (const message of newMessages) {
        if (shouldPersistMessage(message)) {
          // Add to offline queue for reliable delivery
          offlineQueue.add(async () => {
            try {
              persistenceMetrics.chatSaveAttempts++;
              console.log('[AutoPersistence] 💾 Auto-saving chat message:', message.id);
              const savedMessage = await saveChatMessage(currentProjectId!, message);
              
              if (savedMessage) {
                persistenceMetrics.chatSaveSuccesses++;
                // Update the message with server ID
                useChatStore.getState().updateMessage(message.id, {
                  id: savedMessage.id,
                  timestamp: savedMessage.timestamp,
                });
              }
            } catch (error) {
              console.error('[AutoPersistence] Error auto-saving message:', error);
              throw error; // Let offline queue handle retry
            }
          });
        }
      }

      previousMessages = [...currentMessages];
    }
  );

  console.log('[AutoPersistence] ✅ Chat persistence set up');
}

/**
 * Set up canvas persistence with auto-save
 */
async function setupCanvasPersistence(projectId: string): Promise<void> {
  console.log('[AutoPersistence] 🔧 Setting up canvas persistence');

  // Load existing objects with retry
  try {
    const existingObjects = await withRetry(() => loadCanvasObjects(projectId), {
      maxRetries: 3,
      retryDelay: 1000,
    });
    if (existingObjects.length > 0) {
      console.log(`[AutoPersistence] 📥 Loading ${existingObjects.length} existing canvas objects`);
      useCanvasStore.getState().setObjects(existingObjects);
    }
  } catch (error) {
    console.error('[AutoPersistence] Error loading canvas objects:', error);
  }

  // Set up auto-save subscription with debouncing
  let previousObjects: any[] = [];
  let saveTimeout: NodeJS.Timeout | null = null;

  canvasUnsubscribe = useCanvasStore.subscribe(
    (state) => {
      const currentObjects = state.objects;
      
      if (!isPersistenceActive || !currentProjectId) return;

      // Clear existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      // Debounce canvas saves
      saveTimeout = setTimeout(async () => {
        // Find new objects
        const newObjects = currentObjects.filter(
          (current: any) => !previousObjects.some((prev: any) => prev.id === current.id)
        );

        // Save new objects
        for (const object of newObjects) {
          if (isLocalId(object.id)) {
            // Add to offline queue for reliable delivery
            offlineQueue.add(async () => {
              try {
                persistenceMetrics.canvasSaveAttempts++;
                console.log('[AutoPersistence] 💾 Auto-saving canvas object:', object.id);
                const processedObject = await processImageForStorage(currentProjectId!, object);
                const savedObject = await saveCanvasObject(currentProjectId!, processedObject);
                
                if (savedObject) {
                  persistenceMetrics.canvasSaveSuccesses++;
                  // Update the object with server ID
                  useCanvasStore.getState().updateObject(object.id, {
                    id: savedObject.id,
                  });
                }
              } catch (error) {
                console.error('[AutoPersistence] Error auto-saving canvas object:', error);
                throw error; // Let offline queue handle retry
              }
            });
          }
        }

        previousObjects = [...currentObjects];
      }, CANVAS_DEBOUNCE_DELAY);
    }
  );

  console.log('[AutoPersistence] ✅ Canvas persistence set up');
}

/**
 * Disable auto-persistence
 */
export function disableAutoPersistence(): void {
  console.log('[AutoPersistence] 🛑 Disabling auto-persistence');

  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }

  if (canvasUnsubscribe) {
    canvasUnsubscribe();
    canvasUnsubscribe = null;
  }

  isPersistenceActive = false;
  currentProjectId = null;

  console.log('[AutoPersistence] ✅ Auto-persistence disabled');
}

/**
 * Get current persistence status
 */
export function getAutoPersistenceStatus() {
  return {
    isActive: isPersistenceActive,
    projectId: currentProjectId,
  };
}

/**
 * Check if a message should be persisted
 */
function shouldPersistMessage(message: any): boolean {
  // Don't persist temporary messages
  if (message.isTemporary) return false;

  // Don't persist complex UI-only message types
  const nonPersistableTypes = [
    'ad_generation',
    'agent_bubble',
    'temporary_status',
    'ad_step_complete',
    'agent_progress'
  ];

  if (nonPersistableTypes.includes(message.type)) return false;

  // Skip if already has server ID (UUID format)
  if (isServerObject(message.id)) return false;

  return true;
}

/**
 * Check if a canvas object should be persisted
 */
function shouldPersistCanvasObject(object: any): boolean {
  // Skip if already has server ID
  if (isServerObject(object.id)) return false;

  return true;
}

/**
 * Check if an ID is a server-generated UUID
 */
function isServerObject(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Check if an ID is a local-generated UUID
 */
function isLocalId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Check if auto-persistence is currently active
 */
export function isAutoPersistenceActive(): boolean {
  return isPersistenceActive && currentProjectId !== null;
}

/**
 * Background sync - retry failed operations when connection is restored
 */
export function startBackgroundSync() {
  // Check connectivity and process offline queue every 30 seconds
  const syncInterval = setInterval(async () => {
    if (navigator.onLine && isAutoPersistenceActive()) {
      console.log('[AutoPersistence] 🔄 Running background sync...');
      // The offline queue will automatically process pending operations
      // No additional logic needed - the existing retry mechanism handles this
    }
  }, 30000);

  // Listen for online events
  const handleOnline = () => {
    if (isAutoPersistenceActive()) {
      console.log('[AutoPersistence] 🌐 Connection restored, triggering sync');
      // Queue will automatically retry failed operations
    }
  };

  window.addEventListener('online', handleOnline);

  return () => {
    clearInterval(syncInterval);
    window.removeEventListener('online', handleOnline);
  };
} 