import { create } from "zustand"

export type KonvaObjectType = "image" | "text" | "shape"

export interface KonvaObject {
  id: string
  type: KonvaObjectType
  x: number
  y: number
  width?: number
  height?: number
  rotation?: number
  src?: string
  text?: string
  fontSize?: number
  fontFamily?: string
  fill?: string
  draggable?: boolean
  stroke?: string
  strokeWidth?: number
}

type CanvasState = {
  objects: KonvaObject[]
  history: KonvaObject[][]
  historyStep: number
  selectedObjectIds: string[]
  zoomLevel: number
  stageOffset: { x: number; y: number }
  toolMode: 'move' | 'hand' | 'scale'
  isSidebarCollapsed: boolean

  setToolMode: (mode: 'move' | 'hand' | 'scale') => void
  setStageOffset: (offset: { x: number; y: number }) => void
  updateStageOffset: (delta: { x: number; y: number }) => void
  toggleSidebar: () => void
  addObject: (object: Omit<KonvaObject, "id"> & { id?: string }) => void
  addImage: (src: string, x?: number, y?: number, isGeneratedImage?: boolean) => void
  addText: (text: string, x?: number, y?: number) => void
  updateObject: (id: string, updates: Partial<KonvaObject>) => void
  deleteObject: (ids: string | string[]) => void
  setObjects: (objects: KonvaObject[]) => void
  selectObject: (ids: string[] | null) => void
  selectAllObjects: () => void
  clearSelection: () => void
  toggleObjectSelection: (id: string) => void
  setZoomLevel: (level: number) => void
  undo: () => void
  redo: () => void
  saveState: () => void
  isObjectSelected: (id: string) => boolean
  duplicateObject: (id: string) => string | null
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  objects: [],
  history: [[]],
  historyStep: 0,
  selectedObjectIds: [],
  zoomLevel: 1,
  stageOffset: { x: 0, y: 0 },
  toolMode: 'move',
  isSidebarCollapsed: false,

  setToolMode: (mode) => set({ toolMode: mode }),

  setStageOffset: (offset) => set({ stageOffset: offset }),
  updateStageOffset: (delta) =>
    set((state) => ({
      stageOffset: {
        x: state.stageOffset.x + delta.x,
        y: state.stageOffset.y + delta.y,
      },
    })),

  toggleSidebar: () => {
    // Batch the state update to avoid multiple re-renders
    // and efficiently toggle the sidebar state
    set(state => {
      // Cache the new state value to avoid re-computation
      const newState = !state.isSidebarCollapsed;

      // Update state in a single batch
      return { isSidebarCollapsed: newState };
    });
  },

  addObject: (object) => {
    try {
      const newObject = {
        ...object,
        id: object.id || `local-${Math.random().toString(36).substring(2, 9)}`,
        draggable: true,
      }
      set((state) => {
        const newObjects = [...state.objects, newObject]
        return {
          objects: newObjects,
          history: [...state.history.slice(0, state.historyStep + 1), [...newObjects]],
          historyStep: state.historyStep + 1,
        }
      })

      // Legacy thumbnail generation removed
    } catch (error) {
      console.error("Error adding object:", error)
    }
  },

  addImage: (src, x = 20, y = 20, isGeneratedImage = false) => {
    console.log('🔍 DEBUG - canvasStore.addImage called with src:', src, 'x:', x, 'y:', y, 'isGeneratedImage:', isGeneratedImage);
    try {
      // Check if the image already exists on canvas to prevent duplicates
      const existingObjects = get().objects;
      const imageExists = existingObjects.some(obj => {
        if (!obj.src) return false;

        // Handle proxied URLs
        const objIsProxied = obj.src.startsWith('/api/proxy-image');
        const srcIsProxied = src.startsWith('/api/proxy-image');

        const objOriginalUrl = objIsProxied
          ? decodeURIComponent(obj.src.split('?url=')[1] || '')
          : obj.src;

        const srcOriginalUrl = srcIsProxied
          ? decodeURIComponent(src.split('?url=')[1] || '')
          : src;

        return objOriginalUrl === srcOriginalUrl || obj.src === src;
      });

      if (imageExists) {
        console.log('🔍 DEBUG - Image already exists on canvas, skipping:', src);
        return;
      }

      // Create a new image element
      const img = new Image()
      img.crossOrigin = "anonymous"

      // Handle image load
      img.onload = () => {
        console.log('🔍 DEBUG - Image loaded successfully, dimensions:', img.width, 'x', img.height);
        try {
          let finalWidth, finalHeight;

          // If this is a generated image, force 512x512 dimensions
          if (isGeneratedImage) {
            finalWidth = 512;
            finalHeight = 512;
            console.log('🔍 DEBUG - Using fixed dimensions for generated image: 512x512');
          } else {
            // For other images, scale them if needed
            const maxWidth = 400
            const scale = img.width > maxWidth ? maxWidth / img.width : 1
            finalWidth = img.width * scale;
            finalHeight = img.height * scale;
            console.log('🔍 DEBUG - Calculated image scale:', scale, 'maxWidth:', maxWidth);
          }

          // Add the object to the store
          console.log('🔍 DEBUG - Adding image object to store with dimensions:',
            'width:', finalWidth,
            'height:', finalHeight);
          get().addObject({
            type: "image",
            x,
            y,
            width: finalWidth,
            height: finalHeight,
            src,
          })
          console.log('🔍 DEBUG - Image object added to store successfully');
        } catch (error) {
          console.error("❌ ERROR - Error processing loaded image:", error)
        }
      }

      // Handle image error
      img.onerror = (event) => {
        console.error(`❌ ERROR - Failed to load image: ${src}`, event);

        // Try with proxied URL if it's an external URL
        if (src.startsWith('http') && !src.startsWith('/api/proxy-image')) {
          const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(src)}`;
          console.log('🔍 DEBUG - Trying with proxied URL:', proxiedUrl);
          get().addImage(proxiedUrl, x, y, isGeneratedImage);
          return;
        }

        // Add a placeholder instead
        console.log('🔍 DEBUG - Adding placeholder text for failed image');
        get().addObject({
          type: "text",
          x,
          y,
          text: "Image failed to load",
          fontSize: 16,
          fontFamily: "Arial",
          fill: "#FF0000",
        })
      }

      // Set the source to start loading
      img.src = src;

    } catch (error) {
      console.error("❌ ERROR - Error adding image:", error)
    }
  },

  addText: (text, x = 100, y = 100) => {
    try {
      get().addObject({
        type: "text",
        x,
        y,
        text,
        fontSize: 16,
        fontFamily: "Arial",
        fill: "#000000",
      })
    } catch (error) {
      console.error("Error adding text:", error)
    }
  },

  updateObject: (id, updates) => {
    try {
      set((state) => {
        const newObjects = state.objects.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj))
        return {
          objects: newObjects,
        }
      })
      get().saveState()

      // Legacy thumbnail generation removed
    } catch (error) {
      console.error("Error updating object:", error)
    }
  },

  deleteObject: (ids) => {
    try {
      set((state) => {
        const idsArr = Array.isArray(ids) ? ids : [ids]
        const newObjects = state.objects.filter((obj) => !idsArr.includes(obj.id))
        return {
          objects: newObjects,
          selectedObjectIds: state.selectedObjectIds.filter((id) => !idsArr.includes(id)),
        }
      })
      get().saveState()

      // Legacy thumbnail generation removed
    } catch (error) {
      console.error("Error deleting object(s):", error)
    }
  },

  selectObject: (ids: string[] | null) => set({ selectedObjectIds: ids ?? [] }),

  selectAllObjects: () => {
    const allIds = get().objects.filter((obj) => obj.type === "image").map((obj) => obj.id)
    set({ selectedObjectIds: allIds })
  },

  clearSelection: () => set({ selectedObjectIds: [] }),

  toggleObjectSelection: (id) => {
    set((state) => {
      if (state.selectedObjectIds.includes(id)) {
        return { selectedObjectIds: state.selectedObjectIds.filter((sid) => sid !== id) }
      }
      return { selectedObjectIds: [...state.selectedObjectIds, id] }
    })
  },

  setZoomLevel: (level) => {
    set({ zoomLevel: level })
  },

  saveState: () => {
    try {
      set((state) => {
        const currentObjects = [...state.objects]
        return {
          history: [...state.history.slice(0, state.historyStep + 1), currentObjects],
          historyStep: state.historyStep + 1,
        }
      })
    } catch (error) {
      console.error("Error saving state:", error)
    }
  },

  undo: () => {
    try {
      set((state) => {
        if (state.historyStep > 0) {
          return {
            historyStep: state.historyStep - 1,
            objects: [...state.history[state.historyStep - 1]],
            selectedObjectIds: [],
          }
        }
        return state
      })
    } catch (error) {
      console.error("Error undoing:", error)
    }
  },

  redo: () => {
    try {
      set((state) => {
        if (state.historyStep < state.history.length - 1) {
          return {
            historyStep: state.historyStep + 1,
            objects: [...state.history[state.historyStep + 1]],
            selectedObjectIds: [],
          }
        }
        return state
      })
    } catch (error) {
      console.error("Error redoing:", error)
    }
  },

  isObjectSelected: (id) => get().selectedObjectIds.includes(id),

  duplicateObject: (id) => {
    try {
      const objectToDuplicate = get().objects.find(obj => obj.id === id);
      if (!objectToDuplicate) return null;

      // Create a new ID for the duplicate
      const newId = `${id}-${Date.now()}`;

      // Create a duplicate with offset
      const duplicate: KonvaObject = {
        ...objectToDuplicate,
        id: newId,
        x: objectToDuplicate.x + 10,
        y: objectToDuplicate.y + 10
      };

      set(state => {
        const newObjects = [...state.objects, duplicate];
        return {
          objects: newObjects,
          history: [...state.history.slice(0, state.historyStep + 1), [...newObjects]],
          historyStep: state.historyStep + 1,
          selectedObjectIds: [newId]
        };
      });

      return newId;
    } catch (error) {
      console.error("Error duplicating object:", error);
      return null;
    }
  },

  setObjects: (objects) => {
    try {
      console.log('[CanvasStore] Setting objects:', objects.length);
      set((state) => ({
        objects,
        history: [...state.history.slice(0, state.historyStep + 1), [...objects]],
        historyStep: state.historyStep + 1,
        selectedObjectIds: [], // Clear selection when setting new objects
      }));
    } catch (error) {
      console.error("Error setting objects:", error);
    }
  },
}))
