// TEST_DALL_E_INTEGRATION
// This is a test implementation for image generation that can be easily removed later
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY || '';
console.log('🔍 DEBUG - OpenAI API Key length:', apiKey.length, 'First 5 chars:', apiKey.substring(0, 5));

const openai = new OpenAI({
  apiKey: apiKey,
});

export async function POST(req: NextRequest) {
  console.log('🔍 DEBUG - /api/agent/generate-image POST request received');
  
  // Set up SSE headers
  const encoder = new TextEncoder();
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  console.log('🔍 DEBUG - Created response stream');
  
  // Create a response with appropriate SSE headers
  const response = new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });

  console.log('🔍 DEBUG - Set up response with SSE headers');

  // Send events asynchronously
  sendEvents(req, writer).catch(err => {
    console.error('❌ ERROR - Error in sendEvents:', err);
  });

  console.log('🔍 DEBUG - Started sendEvents process');
  return response;
}

async function sendEvents(req: NextRequest, writer: WritableStreamDefaultWriter<Uint8Array>) {
  console.log('🔍 DEBUG - sendEvents function called');
  const encoder = new TextEncoder();
  
  try {
    // Parse the request body
    const body = await req.json();
    const { prompt } = body;
    console.log('🔍 DEBUG - Parsed request body, prompt:', prompt);
    
    // First progress event - immediately send it
    const progressEvent = JSON.stringify({
      type: 'agentProgress',
      content: 'Starting image generation...'
    });
    
    await writer.write(
      encoder.encode(`data: ${progressEvent}\n\n`)
    );
    console.log('🔍 DEBUG - Initial progress event sent');
    
    // Wait a bit to simulate processing
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Second progress event
    const connectingEvent = JSON.stringify({
      type: 'agentProgress',
      content: 'Calling OpenAI DALL-E...'
    });
    
    await writer.write(
      encoder.encode(`data: ${connectingEvent}\n\n`)
    );
    console.log('🔍 DEBUG - Connecting progress event sent');
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Check if the OpenAI API key is available
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.');
    }
    
    // Call OpenAI DALL-E
    let imageUrl = '';
    try {
      console.log('🔍 DEBUG - Making request to OpenAI DALL-E API with model: dall-e-3');
      
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      });
      imageUrl = response.data && response.data[0] && response.data[0].url ? response.data[0].url : '';
      if (!imageUrl) throw new Error('No image URL received from OpenAI.');
      
      // Final success message with image
      const outputEvent = JSON.stringify({
        type: 'agentOutput',
        content: 'Here is your generated image:',
        imageUrls: [imageUrl]
      });
      
      await writer.write(
        encoder.encode(`data: ${outputEvent}\n\n`)
      );
      console.log('🔍 DEBUG - Output event with image URL sent');
      
    } catch (error: any) {
      console.error('❌ ERROR - OpenAI API error:', error);
      console.error('❌ ERROR - Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Handle specific API errors
      let errorMessage = 'Failed to generate image with DALL-E.';
      
      if (error.status === 401) {
        errorMessage = 'API key is invalid or expired. Please check your OpenAI API key.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded or insufficient quota. Please check your OpenAI account billing.';
      } else if (error.message) {
        errorMessage = `Error from OpenAI: ${error.message}`;
      }
      
      // Send error as agentOutput
      const apiErrorEvent = JSON.stringify({
        type: 'agentOutput',
        content: errorMessage
      });
      
      await writer.write(
        encoder.encode(`data: ${apiErrorEvent}\n\n`)
      );
      console.log('🔍 DEBUG - API error event sent');
    }
    
  } catch (error: any) {
    // Send error event for any other errors
    console.error('❌ ERROR - Error in sendEvents processing:', error);
    console.error('❌ ERROR - Error stack:', error.stack);
    
    const errorEvent = JSON.stringify({
      type: 'agentOutput',
      content: error instanceof Error ? `Failed to generate image: ${error.message}` : 'Failed to generate image. Please try again.',
    });
    
    await writer.write(
      encoder.encode(`data: ${errorEvent}\n\n`)
    );
    console.log('🔍 DEBUG - General error event sent');
  } finally {
    // Close the stream
    console.log('🔍 DEBUG - Closing the stream writer');
    await writer.close();
    console.log('🔍 DEBUG - Stream writer closed');
  }
} 