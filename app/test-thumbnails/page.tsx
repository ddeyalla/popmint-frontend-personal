"use client";

import { useState, useRef } from 'react';
import { Stage, Layer, Rect, Circle } from 'react-konva';
import Konva from 'konva';
import { generateThumbnail, uploadThumbnail, generateAndUploadThumbnail } from '@/utils/thumbnail';
import { Button } from '@/components/ui/button';

export default function TestThumbnailsPage() {
  const stageRef = useRef<Konva.Stage>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [testProjectId] = useState('test-project-' + Date.now());

  const handleGenerateThumbnail = async () => {
    if (!stageRef.current) {
      setError('Stage not available');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      console.log('Generating thumbnail for test project:', testProjectId);
      
      // Generate thumbnail blob
      const blob = await generateThumbnail(stageRef.current);
      console.log('Generated blob:', blob.size, 'bytes');

      // Upload to server
      const url = await uploadThumbnail(testProjectId, blob);
      console.log('Upload successful, URL:', url);

      setThumbnailUrl(url);
    } catch (err) {
      console.error('Thumbnail generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndUpload = async () => {
    if (!stageRef.current) {
      setError('Stage not available');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      console.log('Generating and uploading thumbnail for test project:', testProjectId);
      
      const url = await generateAndUploadThumbnail(stageRef.current, testProjectId);
      console.log('Generate and upload successful, URL:', url);

      setThumbnailUrl(url);
    } catch (err) {
      console.error('Generate and upload failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const addRandomShape = () => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const layer = stage.findOne('Layer');
    if (!layer) return;

    // Add a random colored rectangle
    const rect = new Konva.Rect({
      x: Math.random() * 400,
      y: Math.random() * 300,
      width: 50 + Math.random() * 100,
      height: 50 + Math.random() * 100,
      fill: `hsl(${Math.random() * 360}, 70%, 60%)`,
      draggable: true,
    });

    layer.add(rect);
    layer.draw();
  };

  const clearCanvas = () => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const layer = stage.findOne('Layer');
    if (!layer) return;

    layer.destroyChildren();
    layer.draw();
    setThumbnailUrl('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Thumbnail Generation Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Canvas Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Test Canvas</h2>
            <p className="text-gray-600 mb-4">
              Add some shapes to the canvas and then generate a thumbnail.
            </p>
            
            <div className="mb-4 space-x-2">
              <Button onClick={addRandomShape} variant="outline">
                Add Random Shape
              </Button>
              <Button onClick={clearCanvas} variant="outline">
                Clear Canvas
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Stage
                ref={stageRef}
                width={500}
                height={400}
                className="bg-white"
              >
                <Layer>
                  {/* Initial shapes */}
                  <Rect
                    x={50}
                    y={50}
                    width={100}
                    height={80}
                    fill="blue"
                    draggable
                  />
                  <Circle
                    x={200}
                    y={100}
                    radius={40}
                    fill="red"
                    draggable
                  />
                  <Rect
                    x={300}
                    y={150}
                    width={80}
                    height={120}
                    fill="green"
                    draggable
                  />
                </Layer>
              </Stage>
            </div>
          </div>

          {/* Thumbnail Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Generated Thumbnail</h2>
            <p className="text-gray-600 mb-4">
              Project ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{testProjectId}</code>
            </p>

            <div className="mb-4 space-x-2">
              <Button 
                onClick={handleGenerateThumbnail} 
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? 'Generating...' : 'Generate Thumbnail'}
              </Button>
              <Button 
                onClick={handleGenerateAndUpload} 
                disabled={isGenerating}
                variant="outline"
              >
                {isGenerating ? 'Processing...' : 'Generate & Upload'}
              </Button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            {thumbnailUrl && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Generated Thumbnail:</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden inline-block">
                    <img
                      src={thumbnailUrl}
                      alt="Generated thumbnail"
                      className="max-w-full h-auto"
                      style={{ maxWidth: '300px' }}
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Thumbnail URL:</h3>
                  <code className="block bg-gray-100 p-2 rounded text-xs break-all">
                    {thumbnailUrl}
                  </code>
                </div>
              </div>
            )}

            {!thumbnailUrl && !error && !isGenerating && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No thumbnail generated yet</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Add or move shapes on the canvas to create some content</li>
            <li>Click "Generate Thumbnail" to create a thumbnail from the canvas</li>
            <li>The thumbnail will be uploaded to Supabase Storage and displayed</li>
            <li>Check the browser console for detailed logs</li>
            <li>Verify the thumbnail URL is accessible</li>
          </ol>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Expected Behavior:</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
              <li>Thumbnail should be generated as JPEG with ~60% quality</li>
              <li>File size should be under 100KB</li>
              <li>Image should be uploaded to project-thumbnails bucket</li>
              <li>Public URL should be returned and image should display</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
