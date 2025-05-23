"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function DebugPage() {
  const [url, setUrl] = useState("https://www.amazon.com/dp/B07ZPML7NP");
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} - ${message}`]);
  };

  const handleTest = async () => {
    try {
      setIsLoading(true);
      addLog(`Starting test with URL: ${url}`);

      // Generate a session ID
      const sessionId = uuidv4();
      addLog(`Generated session ID: ${sessionId}`);

      // Create initial message object for the chat panel
      const initialMessagePayload = {
        type: "userInput",
        content: `Generate ads for this product: ${url}`,
      };

      // Clear any existing localStorage items
      localStorage.removeItem("popmint-initial-message");
      localStorage.removeItem("popmint-generate-ad");
      localStorage.removeItem("popmint-product-url");
      addLog("Cleared existing localStorage items");

      // Set localStorage items
      localStorage.setItem("popmint-initial-message", JSON.stringify(initialMessagePayload));
      localStorage.setItem("popmint-generate-ad", "true");
      localStorage.setItem("popmint-product-url", url);
      addLog("Set localStorage items for URL processing");

      // Navigate to playground
      addLog(`Navigating to /playground/${sessionId}`);
      router.push(`/playground/${sessionId}`);
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
    }
  };

  const handleDirectTest = async () => {
    try {
      setIsLoading(true);
      addLog(`Starting direct API test with URL: ${url}`);

      // Make a direct API call to test the backend
      const response = await fetch('/api/proxy/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: `test_${Date.now()}`,
          product_url: url,
          n_images: 4
        }),
      });

      const data = await response.json();
      addLog(`API Response: ${JSON.stringify(data)}`);
      
      if (data.job_id) {
        addLog(`Job ID: ${data.job_id}`);
      } else {
        addLog(`Error: No job ID returned`);
      }
      
      setIsLoading(false);
    } catch (error) {
      addLog(`API Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">URL Redirection Debug Tool</h1>
      
      <div className="mb-6">
        <label className="block mb-2">Product URL:</label>
        <input 
          type="text" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleTest}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        >
          {isLoading ? "Testing..." : "Test URL Redirection"}
        </button>
        
        <button
          onClick={handleDirectTest}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-400"
        >
          Test API Directly
        </button>
      </div>
      
      <div className="border rounded p-4 bg-gray-50 h-96 overflow-auto">
        <h2 className="text-lg font-semibold mb-2">Logs:</h2>
        {logs.length === 0 ? (
          <p className="text-gray-500">No logs yet. Start a test to see logs.</p>
        ) : (
          <div className="font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
