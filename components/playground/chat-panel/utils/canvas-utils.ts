/**
 * Helper function to add images to canvas
 * @param imageUrls Array of image URLs to add to the canvas
 * @param useExistingRow If true, will try to add images to an existing row if there's space
 */
export const addImagesToCanvas = async (imageUrls: string[], useExistingRow = false) => {
  try {
    // Validate input
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      console.log('No valid images to add to canvas');
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
    const MAX_IMAGES_PER_ROW = 10; // Limit images per row for better layout

    // Get existing objects
    const existingObjects = canvasStore.objects || [];

    // Find existing generated images (512x512)
    const existingGeneratedImages = existingObjects.filter(obj =>
      obj.type === 'image' &&
      obj.width === DEFAULT_IMAGE_WIDTH &&
      obj.height === DEFAULT_IMAGE_HEIGHT
    );

    // Prepare a map of normalized URLs to detect duplicates more reliably
    const existingImageUrlMap = new Map();
    existingObjects.forEach(obj => {
      if (obj.type === 'image' && obj.src) {
        const isProxied = obj.src.startsWith('/api/proxy-image');
        const normalizedUrl = isProxied
          ? decodeURIComponent(obj.src.split('?url=')[1] || '')
          : obj.src;
        
        if (normalizedUrl) {
          existingImageUrlMap.set(normalizedUrl, true);
        }
      }
    });

    // Determine placement strategy
    let rowStartX = START_X;
    let rowStartY = START_Y;
    let currentRowCount = 0;

    if (useExistingRow && existingGeneratedImages.length > 0) {
      // Group images by Y position to find rows
      const rowsMap = new Map();
      existingGeneratedImages.forEach(img => {
        const key = Math.round(img.y); // Round to handle minor floating point differences
        if (!rowsMap.has(key)) {
          rowsMap.set(key, []);
        }
        rowsMap.get(key).push(img);
      });

      // Find the last row with space
      const rows = Array.from(rowsMap.entries())
        .sort((a, b) => b[0] - a[0]); // Sort by Y position descending

      for (const [rowY, imagesInRow] of rows) {
        if (imagesInRow.length < MAX_IMAGES_PER_ROW) {
          // This row has space
          currentRowCount = imagesInRow.length;
          rowStartY = rowY;
          
          // Sort by X position to find the rightmost image
          imagesInRow.sort((a: any, b: any) => (b.x + b.width) - (a.x + a.width));
          const rightmostImage = imagesInRow[0];
          
          // Start after the rightmost image
          rowStartX = rightmostImage.x + rightmostImage.width + EDGE_TO_EDGE_SPACING;
          break;
        }
      }
      
      // If all rows are full, start a new row below the last one
      if (currentRowCount >= MAX_IMAGES_PER_ROW || currentRowCount === 0) {
        useExistingRow = false;
        currentRowCount = 0;
      }
    }
    
    if (!useExistingRow) {
      // Start a new row
      rowStartX = START_X;
      currentRowCount = 0;
      
      if (existingObjects.length > 0) {
        // Find the bottom of existing content
        const maxY = Math.max(...existingObjects.map(obj => {
          const objY = typeof obj.y === 'number' ? obj.y : 0;
          const objHeight = typeof obj.height === 'number' ? obj.height : 100;
          return objY + objHeight;
        }));
        
        rowStartY = maxY + VERTICAL_SPACING;
      }
    }

    // Process each image
    const addedImages = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      if (!url) continue;
      
      try {
        // Handle proxying for external URLs if needed
        const isExternalUrl = url.startsWith('http') && !url.startsWith('/api/proxy-image');
        const proxiedUrl = isExternalUrl
          ? `/api/proxy-image?url=${encodeURIComponent(url)}`
          : url;
        
        // Normalize URL for duplicate checking
        const normalizedUrl = isExternalUrl ? url : proxiedUrl;
        
        // Check if image already exists on canvas
        if (existingImageUrlMap.has(normalizedUrl)) {
          console.log(`Image ${i} already exists on canvas, skipping`);
          continue;
        }
        
        // Check if we need to start a new row
        if (currentRowCount >= MAX_IMAGES_PER_ROW) {
          rowStartX = START_X;
          rowStartY += DEFAULT_IMAGE_HEIGHT + VERTICAL_SPACING;
          currentRowCount = 0;
        }
        
        // Calculate position for this image
        const x = rowStartX + (currentRowCount * (DEFAULT_IMAGE_WIDTH + EDGE_TO_EDGE_SPACING));
        const y = rowStartY;
        
        console.log(`Adding image ${i} to canvas at position (${x}, ${y})`);
        
        // Add image to canvas with fixed dimensions for generated images
        canvasStore.addImage(
          isExternalUrl ? proxiedUrl : url,
          x,
          y,
          true // Mark as generated image to ensure 512x512 size
        );
        
        // Mark this URL as added
        existingImageUrlMap.set(normalizedUrl, true);
        addedImages.push(normalizedUrl);
        
        // Increment counter for current row
        currentRowCount++;
      } catch (imgErr) {
        console.error(`Error adding image ${i} to canvas:`, imgErr);
      }
    }
    
    return addedImages.length > 0;
  } catch (error) {
    console.error('Error adding images to canvas:', error);
    return false;
  }
};
