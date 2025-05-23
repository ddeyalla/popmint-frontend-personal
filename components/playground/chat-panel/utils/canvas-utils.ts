/**
 * Helper function to add images to canvas
 */
export const addImagesToCanvas = async (imageUrls: string[]) => {
  try {
    const { useCanvasStore } = await import('@/store/canvasStore');
    const canvasStore = useCanvasStore.getState();

    // Constants for positioning
    const DEFAULT_IMAGE_WIDTH = 512;
    const EDGE_TO_EDGE_SPACING = 40; // 40px spacing between image edges
    const START_X = 20;
    const VERTICAL_SPACING = 40;
    const BORDER_WIDTH = 10; // 10px border around images

    // Calculate starting Y position - place below existing content
    const existingObjects = canvasStore.objects;
    let startY = 20;

    if (existingObjects.length > 0) {
      const maxY = Math.max(...existingObjects.map(obj => (obj.y || 0) + (obj.height || 100)));
      startY = maxY + VERTICAL_SPACING;
    }

    // Add each image in a single row with exact 40px edge-to-edge spacing
    imageUrls.forEach((url: string, index: number) => {
      try {
        // Handle proxying for external URLs
        const isExternalUrl = url.startsWith('http') && !url.startsWith('/api/proxy-image');
        const proxiedUrl = isExternalUrl
          ? `/api/proxy-image?url=${encodeURIComponent(url)}`
          : url;

        // Check if image already exists on canvas
        const imageExists = existingObjects.some(obj => {
          if (!obj.src) return false;

          const objIsProxied = obj.src.startsWith('/api/proxy-image');
          const objOriginalUrl = objIsProxied
            ? decodeURIComponent(obj.src.split('?url=')[1] || '')
            : obj.src;

          return objOriginalUrl === url || obj.src === url ||
                objOriginalUrl === proxiedUrl || obj.src === proxiedUrl;
        });

        if (!imageExists) {
          // Calculate X position for 40px edge-to-edge spacing:
          // Image 1: START_X
          // Image 2: START_X + DEFAULT_IMAGE_WIDTH + EDGE_TO_EDGE_SPACING
          // Image 3: START_X + 2 * (DEFAULT_IMAGE_WIDTH + EDGE_TO_EDGE_SPACING)
          const x = START_X + index * (DEFAULT_IMAGE_WIDTH + EDGE_TO_EDGE_SPACING);

          // Add image with 10px border
          canvasStore.addObject({
            type: "image",
            x,
            y: startY,
            width: DEFAULT_IMAGE_WIDTH,
            height: DEFAULT_IMAGE_WIDTH, // Use square images initially
            src: proxiedUrl,
            stroke: "#e5e7eb", // Light gray border
            strokeWidth: BORDER_WIDTH,
            draggable: true,
          });
        }
      } catch (imgErr) {
        console.error(`Error adding image ${index} to canvas:`, imgErr);
      }
    });
  } catch (error) {
    console.error('Error adding images to canvas:', error);
  }
};
