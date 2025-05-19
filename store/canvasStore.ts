import { create } from "zustand"

export type KonvaObjectType = "image" | "text"

export interface KonvaObject {
  id: string
  type: KonvaObjectType
  x: number
  y: number
  width?: number
  height?: number
  src?: string
  text?: string
  fontSize?: number
  fontFamily?: string
  fill?: string
  draggable?: boolean
}

type CanvasState = {
  objects: KonvaObject[]
  history: KonvaObject[][]
  historyStep: number
  selectedObjectIds: string[]
  zoomLevel: number
  stageOffset: { x: number; y: number }
  toolMode: 'move' | 'hand' | 'scale'
  setToolMode: (mode: 'move' | 'hand' | 'scale') => void
  setStageOffset: (offset: { x: number; y: number }) => void
  updateStageOffset: (delta: { x: number; y: number }) => void
  addObject: (object: Omit<KonvaObject, "id">) => void
  addImage: (src: string, x?: number, y?: number) => void
  addText: (text: string, x?: number, y?: number) => void
  updateObject: (id: string, updates: Partial<KonvaObject>) => void
  deleteObject: (ids: string | string[]) => void
  selectObject: (ids: string[] | null) => void
  selectAllObjects: () => void
  clearSelection: () => void
  toggleObjectSelection: (id: string) => void
  setZoomLevel: (level: number) => void
  undo: () => void
  redo: () => void
  saveState: () => void
  isObjectSelected: (id: string) => boolean
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  objects: [],
  history: [[]],
  historyStep: 0,
  selectedObjectIds: [],
  zoomLevel: 1,
  stageOffset: { x: 0, y: 0 },
  toolMode: 'move',
  setToolMode: (mode) => set({ toolMode: mode }),

  setStageOffset: (offset) => set({ stageOffset: offset }),
  updateStageOffset: (delta) =>
    set((state) => ({
      stageOffset: {
        x: state.stageOffset.x + delta.x,
        y: state.stageOffset.y + delta.y,
      },
    })),

  addObject: (object) => {
    try {
      const newObject = {
        ...object,
        id: Math.random().toString(36).substring(2, 9),
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
    } catch (error) {
      console.error("Error adding object:", error)
    }
  },

  addImage: (src, x = 20, y = 20) => {
    try {
      // Create a new image element
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = src

      // Handle image load
      img.onload = () => {
        try {
          const maxWidth = 400
          const scale = img.width > maxWidth ? maxWidth / img.width : 1

          // Add the object to the store
          get().addObject({
            type: "image",
            x,
            y,
            width: img.width * scale,
            height: img.height * scale,
            src,
          })
        } catch (error) {
          console.error("Error processing loaded image:", error)
        }
      }

      // Handle image error
      img.onerror = () => {
        console.error(`Failed to load image: ${src}`)

        // Add a placeholder instead
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
    } catch (error) {
      console.error("Error adding image:", error)
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
}))
