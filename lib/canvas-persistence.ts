// Canvas persistence middleware for Zustand store

import { KonvaObject } from '@/store/canvasStore';
import { apiCall, withRetry, offlineQueue, debounce } from '@/lib/persistence-utils';

export interface CanvasPersistenceConfig {
  projectId: string;
  enabled: boolean;
  debounceDelay: number;
}

// Map local object IDs to server IDs
const localToServerIdMap = new Map<string, string>();

// Track objects that are currently being saved to avoid duplicate saves
const savingObjects = new Set<string>();

/**
 * Convert a local canvas object to the format expected by the API
 */
function objectToApiFormat(object: KonvaObject) {
  return {
    type: object.type,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation || 0,
    src: object.src,
    props: {
      text: object.text,
      fontSize: object.fontSize,
      fontFamily: object.fontFamily,
      fill: object.fill,
      stroke: object.stroke,
      strokeWidth: object.strokeWidth,
    },
  };
}

/**
 * Convert an API object to the format expected by the canvas store
 */
function apiObjectToStoreFormat(apiObject: any): KonvaObject {
  return {
    id: apiObject.id,
    type: apiObject.type,
    x: apiObject.x,
    y: apiObject.y,
    width: apiObject.width,
    height: apiObject.height,
    rotation: apiObject.rotation || 0,
    src: apiObject.src,
    draggable: true,
    // Extract props
    text: apiObject.props?.text,
    fontSize: apiObject.props?.fontSize,
    fontFamily: apiObject.props?.fontFamily,
    fill: apiObject.props?.fill,
    stroke: apiObject.props?.stroke,
    strokeWidth: apiObject.props?.strokeWidth,
  };
}

/**
 * Save a new canvas object to the server
 */
export async function saveCanvasObject(
  projectId: string,
  object: KonvaObject
): Promise<KonvaObject | null> {
  if (savingObjects.has(object.id)) {
    console.log('[CanvasPersistence] Object already being saved:', object.id);
    return null;
  }

  savingObjects.add(object.id);

  try {
    console.log('[CanvasPersistence] Saving object:', object.id);

    const response = await apiCall<{ object: any }>(`/api/projects/${projectId}/canvas`, {
      method: 'POST',
      body: JSON.stringify(objectToApiFormat(object)),
    });

    const serverObject = apiObjectToStoreFormat(response.object);

    // Map local ID to server ID
    localToServerIdMap.set(object.id, serverObject.id);

    console.log('[CanvasPersistence] Object saved successfully:', serverObject.id);
    return serverObject;

  } catch (error) {
    console.error('[CanvasPersistence] Error saving object:', error);

    // Add to offline queue for retry
    offlineQueue.add(() => saveCanvasObject(projectId, object));

    return null;
  } finally {
    savingObjects.delete(object.id);
  }
}

/**
 * Update an existing canvas object on the server
 */
export async function updateCanvasObject(
  projectId: string,
  objectId: string,
  updates: Partial<KonvaObject>
): Promise<boolean> {
  if (savingObjects.has(objectId)) {
    console.log('[CanvasPersistence] Object already being updated:', objectId);
    return false;
  }

  savingObjects.add(objectId);

  try {
    console.log('[CanvasPersistence] Updating object:', objectId);

    await apiCall(`/api/projects/${projectId}/canvas/objects/${objectId}`, {
      method: 'PATCH',
      body: JSON.stringify(objectToApiFormat(updates as KonvaObject)),
    });

    console.log('[CanvasPersistence] Object updated successfully:', objectId);
    return true;

  } catch (error) {
    console.error('[CanvasPersistence] Error updating object:', error);

    // Add to offline queue for retry
    offlineQueue.add(() => updateCanvasObject(projectId, objectId, updates));

    return false;
  } finally {
    savingObjects.delete(objectId);
  }
}

/**
 * Delete a canvas object from the server
 */
export async function deleteCanvasObject(
  projectId: string,
  objectId: string
): Promise<boolean> {
  try {
    console.log('[CanvasPersistence] Deleting object:', objectId);

    await apiCall(`/api/projects/${projectId}/canvas/objects/${objectId}`, {
      method: 'DELETE',
    });

    console.log('[CanvasPersistence] Object deleted successfully:', objectId);
    return true;

  } catch (error) {
    console.error('[CanvasPersistence] Error deleting object:', error);

    // Add to offline queue for retry
    offlineQueue.add(() => deleteCanvasObject(projectId, objectId));

    return false;
  }
}

/**
 * Load all canvas objects for a project
 */
export async function loadCanvasObjects(projectId: string): Promise<KonvaObject[]> {
  try {
    console.log('[CanvasPersistence] Loading objects for project:', projectId);

    const response = await apiCall<{ objects: any[] }>(`/api/projects/${projectId}/canvas`);

    const objects = response.objects.map(apiObjectToStoreFormat);

    console.log(`[CanvasPersistence] Loaded ${objects.length} objects`);
    return objects;

  } catch (error) {
    console.error('[CanvasPersistence] Error loading objects:', error);
    return [];
  }
}

/**
 * Create persistence middleware for canvas store
 */
export function createCanvasPersistenceMiddleware(config: CanvasPersistenceConfig) {
  let isInitialized = false;
  let previousObjects: KonvaObject[] = [];

  // Debounced update function to batch rapid changes
  const debouncedUpdate = debounce(async (projectId: string, objectId: string, object: KonvaObject) => {
    // Get the server ID if this was a local object
    const serverId = localToServerIdMap.get(objectId) || objectId;
    await updateCanvasObject(projectId, serverId, object);
  }, config.debounceDelay);

  return (canvasStore: any) => {
    // Subscribe to object changes
    canvasStore.subscribe(
      (state: any) => state.objects,
      async (currentObjects: KonvaObject[]) => {
        // Skip if persistence is disabled or not initialized
        if (!config.enabled || !config.projectId || !isInitialized) {
          previousObjects = currentObjects;
          return;
        }

        // Find new objects
        const newObjects = currentObjects.filter(
          (current) => !previousObjects.some((prev) => prev.id === current.id)
        );

        // Find deleted objects
        const deletedObjects = previousObjects.filter(
          (prev) => !currentObjects.some((current) => current.id === prev.id)
        );

        // Find updated objects
        const updatedObjects = currentObjects.filter((current) => {
          const previous = previousObjects.find((prev) => prev.id === current.id);
          return previous && JSON.stringify(current) !== JSON.stringify(previous);
        });

        // Handle new objects
        for (const object of newObjects) {
          // Skip if this object doesn't have a local ID (already from server)
          if (!object.id.startsWith('local-')) {
            continue;
          }

          try {
            const serverObject = await saveCanvasObject(config.projectId, object);

            if (serverObject) {
              // Replace the local object with the server object
              canvasStore.getState().updateObject(object.id, {
                id: serverObject.id,
              });
            }
          } catch (error) {
            console.error('[CanvasPersistence] Failed to save object:', error);
          }
        }

        // Handle deleted objects
        for (const object of deletedObjects) {
          const serverId = localToServerIdMap.get(object.id) || object.id;
          await deleteCanvasObject(config.projectId, serverId);
        }

        // Handle updated objects (debounced)
        for (const object of updatedObjects) {
          debouncedUpdate(config.projectId, object.id, object);
        }

        previousObjects = currentObjects;
      }
    );

    // Return control functions
    return {
      initialize: () => {
        isInitialized = true;
        console.log('[CanvasPersistence] Middleware initialized for project:', config.projectId);
      },

      disable: () => {
        isInitialized = false;
        console.log('[CanvasPersistence] Middleware disabled');
      },

      updateConfig: (newConfig: Partial<CanvasPersistenceConfig>) => {
        Object.assign(config, newConfig);
        console.log('[CanvasPersistence] Config updated:', config);
      },
    };
  };
}

/**
 * Hydrate canvas store with objects from server
 */
export async function hydrateCanvasStore(
  canvasStore: any,
  projectId: string
): Promise<boolean> {
  try {
    console.log('[CanvasPersistence] Hydrating canvas store for project:', projectId);

    const objects = await loadCanvasObjects(projectId);

    // Set the loaded objects directly
    canvasStore.getState().setObjects?.(objects) ||
    canvasStore.setState({ objects });

    console.log('[CanvasPersistence] Canvas store hydrated successfully');
    return true;

  } catch (error) {
    console.error('[CanvasPersistence] Error hydrating canvas store:', error);
    return false;
  }
}
