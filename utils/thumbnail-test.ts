// Utility functions for testing thumbnail generation quality
import Konva from 'konva';
import { generateThumbnail } from './thumbnail';

/**
 * Create a test stage with various shapes for thumbnail testing
 */
export function createTestStage(): Konva.Stage {
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width: 800,
    height: 600,
  });

  const layer = new Konva.Layer();

  // Add various test shapes
  const shapes = [
    // Large rectangle
    new Konva.Rect({
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      fill: '#3B82F6',
      stroke: '#1E40AF',
      strokeWidth: 3,
    }),

    // Circle with gradient
    new Konva.Circle({
      x: 400,
      y: 200,
      radius: 80,
      fill: '#EF4444',
      stroke: '#DC2626',
      strokeWidth: 2,
    }),

    // Small shapes at edges (to test bounds calculation)
    new Konva.Rect({
      x: 50,
      y: 50,
      width: 30,
      height: 30,
      fill: '#F59E0B',
    }),

    new Konva.Circle({
      x: 700,
      y: 500,
      radius: 20,
      fill: '#10B981',
    }),

    // Text element
    new Konva.Text({
      x: 300,
      y: 400,
      text: 'Test Thumbnail',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#374151',
    }),

    // Complex shape (star)
    new Konva.Star({
      x: 600,
      y: 150,
      numPoints: 5,
      innerRadius: 30,
      outerRadius: 50,
      fill: '#8B5CF6',
      stroke: '#7C3AED',
      strokeWidth: 2,
    }),
  ];

  shapes.forEach(shape => layer.add(shape));
  stage.add(layer);

  return stage;
}

/**
 * Test thumbnail generation with different quality settings
 */
export async function testThumbnailQuality(): Promise<{
  lowQuality: { blob: Blob; dataUrl: string };
  highQuality: { blob: Blob; dataUrl: string };
  comparison: {
    sizeDifference: number;
    qualityImprovement: string;
  };
}> {
  const stage = createTestStage();

  console.log('[ThumbnailTest] Testing thumbnail quality...');

  // Test low quality (old settings)
  const lowQualityBlob = await generateThumbnail(stage, {
    pixelRatio: 0.5,
    quality: 0.6,
    maxWidth: 512,
    maxHeight: 512,
  });

  // Test high quality (new settings)
  const highQualityBlob = await generateThumbnail(stage, {
    pixelRatio: 2.0,
    quality: 0.85,
    maxWidth: 600,
    maxHeight: 400,
    backgroundColor: '#FAFAFA',
  });

  // Convert blobs to data URLs for comparison
  const lowQualityDataUrl = URL.createObjectURL(lowQualityBlob);
  const highQualityDataUrl = URL.createObjectURL(highQualityBlob);

  const sizeDifference = highQualityBlob.size - lowQualityBlob.size;
  const qualityImprovement = `High quality is ${Math.round((highQualityBlob.size / lowQualityBlob.size) * 100)}% the size of low quality`;

  console.log('[ThumbnailTest] Quality comparison:', {
    lowQuality: {
      size: lowQualityBlob.size,
      sizeKB: Math.round(lowQualityBlob.size / 1024),
    },
    highQuality: {
      size: highQualityBlob.size,
      sizeKB: Math.round(highQualityBlob.size / 1024),
    },
    sizeDifference,
    qualityImprovement,
  });

  // Clean up
  stage.destroy();

  return {
    lowQuality: { blob: lowQualityBlob, dataUrl: lowQualityDataUrl },
    highQuality: { blob: highQualityBlob, dataUrl: highQualityDataUrl },
    comparison: {
      sizeDifference,
      qualityImprovement,
    },
  };
}

/**
 * Test bounds calculation with different canvas layouts
 */
export async function testBoundsCalculation(): Promise<{
  emptyCanvas: { blob: Blob; bounds: any };
  centeredContent: { blob: Blob; bounds: any };
  edgeContent: { blob: Blob; bounds: any };
  scatteredContent: { blob: Blob; bounds: any };
}> {
  console.log('[ThumbnailTest] Testing bounds calculation...');

  // Test 1: Empty canvas
  const emptyStage = new Konva.Stage({
    container: document.createElement('div'),
    width: 800,
    height: 600,
  });
  emptyStage.add(new Konva.Layer());

  // Test 2: Centered content
  const centeredStage = new Konva.Stage({
    container: document.createElement('div'),
    width: 800,
    height: 600,
  });
  const centeredLayer = new Konva.Layer();
  centeredLayer.add(new Konva.Rect({
    x: 350,
    y: 250,
    width: 100,
    height: 100,
    fill: '#3B82F6',
  }));
  centeredStage.add(centeredLayer);

  // Test 3: Edge content
  const edgeStage = new Konva.Stage({
    container: document.createElement('div'),
    width: 800,
    height: 600,
  });
  const edgeLayer = new Konva.Layer();
  edgeLayer.add(new Konva.Circle({ x: 50, y: 50, radius: 25, fill: '#EF4444' }));
  edgeLayer.add(new Konva.Circle({ x: 750, y: 550, radius: 25, fill: '#10B981' }));
  edgeStage.add(edgeLayer);

  // Test 4: Scattered content
  const scatteredStage = createTestStage();

  const tests = [
    { name: 'emptyCanvas', stage: emptyStage },
    { name: 'centeredContent', stage: centeredStage },
    { name: 'edgeContent', stage: edgeStage },
    { name: 'scatteredContent', stage: scatteredStage },
  ];

  const results: any = {};

  for (const test of tests) {
    const blob = await generateThumbnail(test.stage, {
      pixelRatio: 2.0,
      quality: 0.85,
      maxWidth: 600,
      maxHeight: 400,
      backgroundColor: '#FAFAFA',
    });

    results[test.name] = {
      blob,
      bounds: `${test.name} - Size: ${Math.round(blob.size / 1024)}KB`,
    };

    test.stage.destroy();
  }

  return results;
}

/**
 * Performance test for thumbnail generation
 */
export async function testThumbnailPerformance(): Promise<{
  averageTime: number;
  results: Array<{ attempt: number; time: number; size: number }>;
}> {
  console.log('[ThumbnailTest] Testing thumbnail generation performance...');

  const results: Array<{ attempt: number; time: number; size: number }> = [];
  const attempts = 5;

  for (let i = 0; i < attempts; i++) {
    const stage = createTestStage();
    const startTime = performance.now();

    const blob = await generateThumbnail(stage, {
      pixelRatio: 2.0,
      quality: 0.85,
      maxWidth: 600,
      maxHeight: 400,
      backgroundColor: '#FAFAFA',
    });

    const endTime = performance.now();
    const time = endTime - startTime;

    results.push({
      attempt: i + 1,
      time,
      size: blob.size,
    });

    stage.destroy();
  }

  const averageTime = results.reduce((sum, result) => sum + result.time, 0) / results.length;

  console.log('[ThumbnailTest] Performance results:', {
    averageTime: `${averageTime.toFixed(2)}ms`,
    results,
  });

  return { averageTime, results };
}
