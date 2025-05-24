// Persistence manager to coordinate all persistence operations

import { useProjectStore } from '@/store/projectStore';
import { useChatStore } from '@/store/chatStore';
import { useCanvasStore } from '@/store/canvasStore';
import { 
  createChatPersistenceMiddleware, 
  hydrateChatStore,
  type ChatPersistenceConfig 
} from '@/lib/chat-persistence';
import { 
  createCanvasPersistenceMiddleware, 
  hydrateCanvasStore,
  type CanvasPersistenceConfig 
} from '@/lib/canvas-persistence';

export interface PersistenceManagerConfig {
  projectId: string;
  enabled: boolean;
  chatConfig?: Partial<ChatPersistenceConfig>;
  canvasConfig?: Partial<CanvasPersistenceConfig>;
}

export class PersistenceManager {
  private config: PersistenceManagerConfig;
  private chatMiddleware: any;
  private canvasMiddleware: any;
  private isInitialized = false;

  constructor(config: PersistenceManagerConfig) {
    this.config = config;
    this.setupMiddleware();
  }

  private setupMiddleware() {
    // Setup chat persistence middleware
    const chatConfig: ChatPersistenceConfig = {
      projectId: this.config.projectId,
      enabled: this.config.enabled,
      ...this.config.chatConfig,
    };

    // Setup canvas persistence middleware
    const canvasConfig: CanvasPersistenceConfig = {
      projectId: this.config.projectId,
      enabled: this.config.enabled,
      debounceDelay: 100, // 100ms debounce for canvas updates
      ...this.config.canvasConfig,
    };

    // Create middleware instances
    this.chatMiddleware = createChatPersistenceMiddleware(chatConfig)(useChatStore);
    this.canvasMiddleware = createCanvasPersistenceMiddleware(canvasConfig)(useCanvasStore);
  }

  /**
   * Initialize persistence for a project
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('[PersistenceManager] Already initialized');
      return true;
    }

    try {
      console.log('[PersistenceManager] Initializing for project:', this.config.projectId);

      // Set current project in project store
      useProjectStore.getState().setCurrentProject(this.config.projectId);

      // Hydrate stores with data from server
      const [chatSuccess, canvasSuccess] = await Promise.all([
        this.hydrateChatStore(),
        this.hydrateCanvasStore(),
      ]);

      if (!chatSuccess || !canvasSuccess) {
        console.error('[PersistenceManager] Failed to hydrate stores');
        return false;
      }

      // Initialize middleware
      this.chatMiddleware.initialize();
      this.canvasMiddleware.initialize();

      this.isInitialized = true;
      console.log('[PersistenceManager] Initialized successfully');
      return true;

    } catch (error) {
      console.error('[PersistenceManager] Error during initialization:', error);
      return false;
    }
  }

  /**
   * Hydrate chat store with messages from server
   */
  private async hydrateChatStore(): Promise<boolean> {
    try {
      console.log('[PersistenceManager] Hydrating chat store');
      return await hydrateChatStore(useChatStore, this.config.projectId);
    } catch (error) {
      console.error('[PersistenceManager] Error hydrating chat store:', error);
      return false;
    }
  }

  /**
   * Hydrate canvas store with objects from server
   */
  private async hydrateCanvasStore(): Promise<boolean> {
    try {
      console.log('[PersistenceManager] Hydrating canvas store');
      return await hydrateCanvasStore(useCanvasStore, this.config.projectId);
    } catch (error) {
      console.error('[PersistenceManager] Error hydrating canvas store:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PersistenceManagerConfig>) {
    const oldProjectId = this.config.projectId;
    this.config = { ...this.config, ...newConfig };

    // If project ID changed, reinitialize
    if (newConfig.projectId && newConfig.projectId !== oldProjectId) {
      this.disable();
      this.setupMiddleware();
      this.initialize();
    } else {
      // Update middleware configs
      this.chatMiddleware?.updateConfig?.(this.config.chatConfig);
      this.canvasMiddleware?.updateConfig?.(this.config.canvasConfig);
    }
  }

  /**
   * Enable persistence
   */
  enable() {
    this.config.enabled = true;
    this.chatMiddleware?.updateConfig?.({ enabled: true });
    this.canvasMiddleware?.updateConfig?.({ enabled: true });
    console.log('[PersistenceManager] Persistence enabled');
  }

  /**
   * Disable persistence
   */
  disable() {
    this.config.enabled = false;
    this.chatMiddleware?.disable?.();
    this.canvasMiddleware?.disable?.();
    this.isInitialized = false;
    console.log('[PersistenceManager] Persistence disabled');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      enabled: this.config.enabled,
      projectId: this.config.projectId,
    };
  }
}

// Global persistence manager instance
let globalPersistenceManager: PersistenceManager | null = null;

/**
 * Get or create the global persistence manager
 */
export function getPersistenceManager(config?: PersistenceManagerConfig): PersistenceManager {
  if (!globalPersistenceManager && config) {
    globalPersistenceManager = new PersistenceManager(config);
  } else if (globalPersistenceManager && config) {
    globalPersistenceManager.updateConfig(config);
  }

  if (!globalPersistenceManager) {
    throw new Error('PersistenceManager not initialized. Provide config on first call.');
  }

  return globalPersistenceManager;
}

/**
 * Initialize persistence for a project
 */
export async function initializePersistence(projectId: string): Promise<boolean> {
  try {
    const manager = getPersistenceManager({
      projectId,
      enabled: true,
    });

    return await manager.initialize();
  } catch (error) {
    console.error('[PersistenceManager] Error initializing persistence:', error);
    return false;
  }
}

/**
 * Disable persistence (useful for cleanup)
 */
export function disablePersistence() {
  if (globalPersistenceManager) {
    globalPersistenceManager.disable();
  }
}

/**
 * Hook for React components to use persistence
 */
export function usePersistence(projectId?: string) {
  const manager = globalPersistenceManager;
  
  return {
    manager,
    isInitialized: manager?.getStatus().isInitialized || false,
    enabled: manager?.getStatus().enabled || false,
    currentProjectId: manager?.getStatus().projectId,
    initialize: (id: string) => initializePersistence(id),
    disable: disablePersistence,
  };
}
