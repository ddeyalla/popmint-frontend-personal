/**
 * Helper function to add images to canvas
 * @param imageUrls Array of image URLs to add to the canvas
 * @param useExistingRow If true, will try to add images to an existing row if there's space
 */
export const addImagesToCanvas = async (imageUrls: string[], useExistingRow = false) => {
  try {
    if (!imageUrls || imageUrls.length === 0) {
      console.log('No images to add to canvas');
      return;
    }

    console.log(`Adding ${imageUrls.length} images to canvas, useExistingRow:`, useExistingRow);

    const { useCanvasStore } = await import('@/store/canvasStore');
    const canvasStore = useCanvasStore.getState();

    // Constants for positioning
    const DEFAULT_IMAGE_WIDTH = 512;
    const DEFAULT_IMAGE_HEIGHT = 512;
    const EDGE_TO_EDGE_SPACING = 40; // 40px spacing between image edges
    const START_X = 20;
    const START_Y = 20;
    const VERTICAL_SPACING = 40;

    // Get existing objects
    const existingObjects = canvasStore.objects;

    // Find existing generated images (512x512)
    const existingGeneratedImages = existingObjects.filter(obj =>
      obj.type === 'image' &&
      obj.width === DEFAULT_IMAGE_WIDTH &&
      obj.height === DEFAULT_IMAGE_HEIGHT
    );

    // Calculate starting position
    let startX = START_X;
    let startY = 20;
    let nextIndex = 0;

    if (useExistingRow && existingGeneratedImages.length > 0) {
      // Find the last row of generated images
      const lastRowY = Math.max(...existingGeneratedImages.map(img => img.y));
      const lastRowImages = existingGeneratedImages.filter(img => img.y === lastRowY);

      if (lastRowImages.length > 0) {
        // Sort by X position to find the rightmost image
        lastRowImages.sort((a, b) => (b.x + b.width) - (a.x + a.width));
        const rightmostImage = lastRowImages[0];

        // Start after the rightmost image
        startX = rightmostImage.x + rightmostImage.width + EDGE_TO_EDGE_SPACING;
        startY = lastRowY;
        nextIndex = lastRowImages.length;
      }
    } else if (existingObjects.length > 0) {
      // Start a new row below existing content
      const maxY = Math.max(...existingObjects.map(obj => (obj.y || 0) + (obj.height || 100)));
      startY = maxY + VERTICAL_SPACING;
    }

    // Add each image in a single row with exact 40px edge-to-edge spacing
    imageUrls.forEach((url: string, index: number) => {
      try {
        // Handle proxying for external URLs if needed
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

          const urlOriginalUrl = isExternalUrl
            ? url
            : proxiedUrl;

          return objOriginalUrl === url || obj.src === url ||
                objOriginalUrl === proxiedUrl || obj.src === proxiedUrl ||
                objOriginalUrl === urlOriginalUrl || obj.src === urlOriginalUrl;
        });

        if (!imageExists) {
          // Calculate X position for 40px edge-to-edge spacing
          const x = startX + (index + nextIndex) * (DEFAULT_IMAGE_WIDTH + EDGE_TO_EDGE_SPACING);

          // Use START_Y for consistent positioning
          const y = START_Y;

          console.log(`Adding image ${index} to canvas at position (${x}, ${y})`);

          // Add image to canvas with fixed dimensions for generated images
          canvasStore.addImage(
            isExternalUrl ? proxiedUrl : url, // Use proxied URL for external images
            x,
            y,
            true // Mark as generated image to ensure 512x512 size
          );
        } else {
          console.log(`Image ${index} already exists on canvas, skipping`);
        }
      } catch (imgErr) {
        console.error(`Error adding image ${index} to canvas:`, imgErr);
      }
    });
  } catch (error) {
    console.error('Error adding images to canvas:', error);
  }
};
