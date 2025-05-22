import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// URL of the backend service
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  console.log('🔍 DEBUG - /api/proxy/generate/stream GET request received');
  
  try {
    // Extract job_id from the query parameters
    const searchParams = req.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');
    
    if (!jobId) {
      console.error('❌ ERROR - Missing job_id parameter');
      return new Response(
        JSON.stringify({ error: 'Missing job_id parameter', errorCode: 'MISSING_JOB_ID' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('🔍 DEBUG - Connecting to stream for job ID:', jobId);
    console.log('🔍 DEBUG - Backend URL:', BACKEND_URL);
    
    // Get Last-Event-ID for reconnection if provided
    const lastEventId = req.headers.get('Last-Event-ID');
    
    // Create headers for the backend request
    const headers: HeadersInit = {
      'Accept': 'text/event-stream',
    };
    
    if (lastEventId) {
      console.log('🔍 DEBUG - Last-Event-ID provided:', lastEventId);
      headers['Last-Event-ID'] = lastEventId;
    }
    
    // Forward the request to the backend SSE endpoint
    const streamUrl = `${BACKEND_URL}/generate/stream?job_id=${jobId}`;
    console.log('🔍 DEBUG - Connecting to backend stream URL:', streamUrl);
    
    const backendResponse = await fetch(streamUrl, { headers });
    
    // Handle non-success responses
    if (!backendResponse.ok) {
      console.error(`❌ ERROR - Backend responded with status ${backendResponse.status}`);
      
      if (backendResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'job_not_found', errorCode: 'JOB_NOT_FOUND' }),
          { 
            status: 404, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Backend server error', 
          errorCode: 'BACKEND_ERROR',
          status: backendResponse.status
        }),
        { 
          status: backendResponse.status, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('✅ SUCCESS - Connected to backend SSE stream');
    
    // Set up proper SSE headers for the frontend
    return new Response(backendResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      },
    });
    
  } catch (error: any) {
    console.error('❌ ERROR - Error in proxy/generate/stream:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to connect to streaming service', 
        errorCode: 'CONNECTION_ERROR',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
} 