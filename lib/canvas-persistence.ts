// Canvas persistence middleware for Zustand store

import { KonvaObject } from '@/store/canvasStore';
import { apiCall, withRetry, offlineQueue, debounce } from '@/lib/persistence-utils';
import { uploadImageFromUrl, isSupabaseStorageUrl } from '@/lib/supabase-storage';

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
 * Upload image to Supabase Storage if it's an external URL
 */
export async function processImageForStorage(
  projectId: string,
  object: KonvaObject
): Promise<KonvaObject> {
  // Only process image objects with external URLs
  if (object.type !== 'image' || !object.src) {
    return object;
  }

  // Skip if already a Supabase Storage URL
  if (isSupabaseStorageUrl(object.src)) {
    console.log('[CanvasPersistence] Image already in storage:', object.src);
    return object;
  }

  // Skip if it's a blob URL (local file)
  if (object.src.startsWith('blob:')) {
    console.log('[CanvasPersistence] Skipping blob URL (local file):', object.src);
    return object;
  }

  // Skip if it's a data URL
  if (object.src.startsWith('data:')) {
    console.log('[CanvasPersistence] Skipping data URL:', object.src.substring(0, 50) + '...');
    return object;
  }

  try {
    console.log('[CanvasPersistence] Uploading image to storage:', object.src);
    
    const result = await uploadImageFromUrl(projectId, object.src);
    
    if (result.success && result.url) {
      console.log('[CanvasPersistence] Image uploaded successfully:', {
        original: object.src,
        storage: result.url,
      });
      
      return {
        ...object,
        src: result.url,
      };
    } else {
      console.error('[CanvasPersistence] Failed to upload image:', result.error);
      // Return original object if upload fails
      return object;
    }
  } catch (error) {
    console.error('[CanvasPersistence] Error uploading image:', error);
    // Return original object if upload fails
    return object;
  }
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
    console.log('[CanvasPersistence] 🔍 DEBUG: Saving object:', {
      projectId,
      objectId: object.id,
      type: object.type,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      src: object.src ? 'present' : 'none',
    });

    // Process image for storage upload if needed
    const processedObject = await processImageForStorage(projectId, object);

    // Ensure type is one of the allowed values
    let type = processedObject.type;
    if (!['image', 'text', 'shape'].includes(type)) {
      console.warn(`[CanvasPersistence] ⚠️ Invalid type "${type}", defaulting to "shape"`);
      type = 'shape';
    }

    const apiObject = {
      ...objectToApiFormat(processedObject),
      type: type, // Override with validated type
    };

    console.log('[CanvasPersistence] 🔍 DEBUG: Converted to API format:', {
      type: apiObject.type,
      x: apiObject.x,
      y: apiObject.y,
      src: apiObject.src ? (apiObject.src.length > 50 ? apiObject.src.substring(0, 50) + '...' : apiObject.src) : 'none',
      props_keys: Object.keys(apiObject.props || {}),
    });

    const response = await apiCall<{ object: any }>(`/api/projects/${projectId}/canvas`, {
      method: 'POST',
      body: JSON.stringify(apiObject),
    });

    console.log('[CanvasPersistence] 🔍 DEBUG: API response received:', {
      success: !!response.object,
      objectId: response.object?.id,
    });

    const serverObject = apiObjectToStoreFormat(response.object);

    // Map local ID to server ID
    localToServerIdMap.set(object.id, serverObject.id);

    console.log('[CanvasPersistence] ✅ Object saved successfully:', {
      localId: object.id,
      serverId: serverObject.id,
      type: serverObject.type,
    });
    return serverObject;

  } catch (error) {
    console.error('[CanvasPersistence] 💥 ERROR saving object:', {
      projectId,
      objectId: object.id,
      type: object.type,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

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
        console.log('[CanvasPersistence] 🔔 Store subscription triggered');
        console.log('[CanvasPersistence] 📊 Current objects count:', currentObjects?.length || 0);
        console.log('[CanvasPersistence] 📊 Previous objects count:', previousObjects?.length || 0);

        // Skip if persistence is disabled or not initialized
        if (!config.enabled || !config.projectId) {
          console.log('[CanvasPersistence] ⏸️ Skipping - persistence disabled or no project ID:', { enabled: config.enabled, projectId: config.projectId });
          previousObjects = currentObjects;
          return;
        }

        if (!isInitialized) {
          console.log('[CanvasPersistence] ⏸️ Skipping - middleware not initialized yet');
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
          console.log('[CanvasPersistence] 🔍 Processing object:', {
            id: object.id,
            type: object.type,
            x: object.x,
            y: object.y,
            width: object.width,
            height: object.height,
          });

          // Skip if this object already has a server ID (UUID format)
          const isServerObject = object.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
          if (isServerObject) {
            console.log('[CanvasPersistence] ⏭️ Skipping server object (already persisted):', object.id);
            continue;
          }

          try {
            console.log('[CanvasPersistence] 💾 Attempting to save new object:', {
              id: object.id,
              type: object.type,
              position: `${object.x},${object.y}`,
            });
            const serverObject = await saveCanvasObject(config.projectId, object);

            if (serverObject) {
              // Replace the local object with the server object
              canvasStore.getState().updateObject(object.id, {
                id: serverObject.id,
              });
              console.log('[CanvasPersistence] ✅ Object saved and updated in store:', {
                oldId: object.id,
                newId: serverObject.id,
              });
            } else {
              console.error('[CanvasPersistence] ❌ Failed to save object (null returned):', object.id);
            }
          } catch (error) {
            console.error('[CanvasPersistence] 💥 Exception while saving object:', {
              objectId: object.id,
              error: error instanceof Error ? error.message : error,
            });
          }
        }

        // Handle deleted objects
        for (const object of deletedObjects) {
          const serverId = localToServerIdMap.get(object.id) || object.id;
          await deleteCanvasObject(config.projectId, serverId);
        }

        // Handle updated objects (debounced)
        for (const object of updatedObjects) {
          console.log('[CanvasPersistence] Scheduling update for object:', object.id, object.type);
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
    console.log('[CanvasPersistence] 💾 Starting canvas store hydration for project:', projectId);

    const objects = await loadCanvasObjects(projectId);
    console.log(`[CanvasPersistence] 📥 Loaded ${objects.length} objects from server`);

    if (objects.length === 0) {
      console.log('[CanvasPersistence] ✅ No objects to hydrate, canvas store ready');
      return true;
    }

    // Validate object format before setting
    const validObjects = objects.filter(obj => {
      if (!obj.id || !obj.type || obj.x === undefined || obj.y === undefined) {
        console.warn('[CanvasPersistence] ⚠️ Invalid object format, skipping:', obj);
        return false;
      }
      return true;
    });

    console.log(`[CanvasPersistence] ✅ Validated ${validObjects.length}/${objects.length} objects`);

    // Set the loaded objects directly - use setObjects if available, otherwise setState
    // The middleware should already be initialized at this point
    if (canvasStore.getState().setObjects) {
      canvasStore.getState().setObjects(validObjects);
    } else {
      canvasStore.setState({ objects: validObjects });
    }

    console.log('[CanvasPersistence] 🎉 Canvas store hydrated successfully');
    return true;

  } catch (error) {
    console.error('[CanvasPersistence] 💥 Error hydrating canvas store:', error);

    // Try to set empty objects array to ensure store is in a valid state
    try {
      if (canvasStore.getState().setObjects) {
        canvasStore.getState().setObjects([]);
      } else {
        canvasStore.setState({ objects: [] });
      }
      console.log('[CanvasPersistence] 🔄 Set empty objects array as fallback');
    } catch (fallbackError) {
      console.error('[CanvasPersistence] 💥 Failed to set fallback empty objects:', fallbackError);
    }

    return false;
  }
}
