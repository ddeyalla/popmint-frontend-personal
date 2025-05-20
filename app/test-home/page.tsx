import Link from 'next/link';

export default function TestHome() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Popmint Testing Pages</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Available Test Pages</h2>
        
        <ul className="space-y-4">
          <li className="p-3 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors">
            <Link href="/test" className="flex flex-col">
              <span className="font-medium text-blue-600">DALL-E Image Generation</span>
              <span className="text-sm text-gray-500">Test the image generation API with a simple interface</span>
            </Link>
          </li>
          
          <li className="p-3 border border-gray-200 rounded-md hover:bg-blue-50 transition-colors">
            <Link href="/playground/demo" className="flex flex-col">
              <span className="font-medium text-blue-600">Canvas Playground</span>
              <span className="text-sm text-gray-500">Test the full chat and canvas integration</span>
            </Link>
          </li>
        </ul>
        
        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
          <p>Note: These pages are for testing purposes only. Make sure to update the <code>.env.local</code> file with your OpenAI API key.</p>
        </div>
      </div>
    </div>
  );
} 