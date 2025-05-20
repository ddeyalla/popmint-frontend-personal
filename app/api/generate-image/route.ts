import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Ensure this is not 'edge'!

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY || '';

// Log OpenAI SDK version for debugging
console.log('🔍 DEBUG - OpenAI SDK version:', (OpenAI as any).version || 'unknown');

if (!apiKey) {
  console.error('❌ ERROR - OPENAI_API_KEY is missing. Please set it in your environment variables.');
}

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function POST(req: NextRequest) {
  console.log('🔍 DEBUG - /api/generate-image POST request received');
  
  try {
    // Parse the request body
    const body = await req.json();
    const { prompt } = body;
    
    if (!prompt) {
      console.error('❌ ERROR - Prompt is missing in request body:', body);
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    console.log('🔍 DEBUG - Processing prompt:', prompt);
    
    // Check if the OpenAI API key is available
    if (!apiKey) {
      console.error('❌ ERROR - OpenAI API key is not configured');
      return Response.json(
        { error: 'OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }
    
    // Call OpenAI DALL-E
    console.log('🔍 DEBUG - Making request to OpenAI DALL-E API with model: dall-e-3');
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    });
    
    const imageUrl = response.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error('❌ ERROR - No image URL received from OpenAI. Response:', response);
      return Response.json({ error: 'Failed to generate image.' }, { status: 500 });
    }
    
    console.log('✅ SUCCESS - Image generated successfully:', imageUrl);
    
    // Return the image URL
    return Response.json({
      imageUrl,
      success: true,
    });
    
  } catch (error: any) {
    // Log the full error object for debugging
    console.error('❌ ERROR - OpenAI API error:', error);
    if (error?.response) {
      console.error('❌ ERROR - OpenAI API error response data:', error.response.data);
    }
    
    // Handle specific API errors
    let errorMessage = 'Failed to generate image with DALL-E.';
    let statusCode = 500;
    
    if (error.status === 401) {
      errorMessage = 'API key is invalid or expired. Please check your OpenAI API key.';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded or insufficient quota. Please check your OpenAI account billing.';
    } else if (error.message) {
      errorMessage = `Error from OpenAI: ${error.message}`;
    }
    
    // Add a hint if the error is related to the SDK version
    if (errorMessage.includes('model') || errorMessage.includes('not found')) {
      errorMessage += ' (Hint: Make sure you are using openai npm package v4.0.0 or newer for DALL-E 3 support)';
    }
    
    return Response.json({ error: errorMessage }, { status: statusCode });
  }
} 