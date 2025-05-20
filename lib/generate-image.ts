import { z } from 'zod';

/**
 * Generates a DALL-E image from a prompt using the /api/generate-image endpoint.
 * Returns the proxied image URL for use in the UI/canvas.
 * Throws on error.
 */
export async function generateImageFromPrompt(rawPrompt: string): Promise<string> {
  // Parse the prompt: remove '/image' or 'generate image' command
  let prompt = rawPrompt.trim();
  if (prompt.toLowerCase().startsWith('/image')) {
    prompt = prompt.substring('/image'.length).trim();
  } else {
    prompt = prompt.replace(/generate image/i, '').trim();
  }
  if (!prompt) {
    prompt = 'A beautiful landscape';
  }

  // Validate prompt
  const promptSchema = z.string().min(2).max(400);
  promptSchema.parse(prompt);

  // Call the API
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  const data = await response.json();
  if (!data.success || !data.imageUrl) {
    throw new Error(data.error || 'Failed to generate image');
  }

  // Proxy the image URL to avoid CORS issues
  const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(data.imageUrl)}`;
  return proxiedUrl;
} 