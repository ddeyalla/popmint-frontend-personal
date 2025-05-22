import React from 'react';
import AdGenerator from '@/components/ad-generator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Ad Generation API Test',
  description: 'Test page for the ad generation API integration',
};

export default function AdApiTestPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ad Generation API Integration Test</h1>
        <Link href="/playground/session123">
          <Button variant="outline">Try in Playground</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <p className="mb-6 text-gray-700">
            This page demonstrates the standalone integration with the backend ad generation API.
            Enter a product URL to generate ad ideas with images.
          </p>
          
          <h2 className="text-lg font-semibold mb-4">Sample Product URLs to Try:</h2>
          <ul className="list-disc list-inside space-y-2 mb-6">
            <li><code className="px-2 py-1 bg-gray-100 rounded">https://www.amazon.com/Apple-iPhone-Pro-128GB-Gold/dp/B0CHX3QBCH/</code></li>
            <li><code className="px-2 py-1 bg-gray-100 rounded">https://www.allbirds.com/products/mens-tree-runners</code></li>
            <li><code className="px-2 py-1 bg-gray-100 rounded">https://www.dyson.com/vacuum-cleaners/sticks/dyson-v11-stick/dyson-v11-absolute</code></li>
          </ul>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">In the Playground</h2>
          <p className="mb-4 text-gray-700">
            You can also use ad generation directly in the chat panel by pasting a product URL:
          </p>
          <div className="bg-black text-white p-3 rounded-md font-mono text-sm mb-4 overflow-auto">
            https://example.com/product
          </div>
          <p className="text-gray-600 text-sm">
            This will analyze the product page and generate ad concepts with images.
            The images will automatically appear on the canvas.
          </p>
        </div>
      </div>
      
      <div className="bg-white shadow-sm border rounded-lg p-6 mb-8">
        <AdGenerator 
          defaultProductUrl="https://www.amazon.com/Apple-iPhone-Pro-128GB-Gold/dp/B0CHX3QBCH/" 
          defaultImageCount={4}
        />
      </div>
      
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">How It Works</h2>
        <ol className="list-decimal list-inside space-y-3">
          <li className="pb-2 border-b border-gray-200">
            <span className="font-medium">Input Product URL:</span>
            <p className="ml-6 mt-1 text-gray-600">Provide the URL of the product you want to generate ads for.</p>
          </li>
          <li className="pb-2 border-b border-gray-200">
            <span className="font-medium">Select Image Count:</span>
            <p className="ml-6 mt-1 text-gray-600">Choose how many images to generate (1-10).</p>
          </li>
          <li className="pb-2 border-b border-gray-200">
            <span className="font-medium">Generate:</span>
            <p className="ml-6 mt-1 text-gray-600">The API analyzes the product page, extracts key features and creates ad concepts.</p>
          </li>
          <li className="pb-2 border-b border-gray-200">
            <span className="font-medium">Real-time Progress:</span>
            <p className="ml-6 mt-1 text-gray-600">Updates are streamed in real-time using Server-Sent Events (SSE).</p>
          </li>
          <li>
            <span className="font-medium">Results:</span>
            <p className="ml-6 mt-1 text-gray-600">Generated ad images are displayed and can be used in your marketing materials.</p>
          </li>
        </ol>
        
        <div className="mt-6 bg-blue-50 p-4 rounded-md">
          <h3 className="text-blue-800 font-medium mb-2">API Endpoints</h3>
          <div className="space-y-2 text-sm">
            <p><code className="font-mono font-bold">GET /api/proxy/healthz</code> - Health check</p>
            <p><code className="font-mono font-bold">POST /api/proxy/generate</code> - Start ad generation</p>
            <p><code className="font-mono font-bold">GET /api/proxy/generate/stream</code> - SSE updates</p>
            <p><code className="font-mono font-bold">POST /api/proxy/cancel/:jobId</code> - Cancel generation</p>
          </div>
        </div>
      </div>
    </div>
  );
} 