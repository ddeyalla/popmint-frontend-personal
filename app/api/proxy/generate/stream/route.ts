import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// URL of the backend service
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

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
    // Ensure the job ID is properly encoded
    const encodedJobId = encodeURIComponent(jobId);
    const streamUrl = `${BACKEND_URL}/generate/stream?job_id=${encodedJobId}`;
    console.log('🔍 DEBUG - Connecting to backend stream URL:', streamUrl);
    console.log('🔍 DEBUG - Request headers:', JSON.stringify(headers));

    try {
      // Validate the backend URL before making the request
      if (!BACKEND_URL || !streamUrl) {
        throw new Error('Invalid backend URL configuration');
      }

      // Create a controller for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const backendResponse = await fetch(streamUrl, {
        headers,
        signal: controller.signal,
        // Add additional options to improve reliability
        cache: 'no-store',
        keepalive: true
      }).finally(() => {
        clearTimeout(timeoutId);
      });

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

      // Check if the response body is available
      if (!backendResponse.body) {
        throw new Error('Backend response body is null or undefined');
      }

      // Set up proper SSE headers for the frontend
      return new Response(backendResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          // Add additional headers to improve reliability
          'Transfer-Encoding': 'chunked'
        },
      });
    } catch (error: any) {
      console.error('❌ ERROR - Error connecting to backend SSE stream:', error);

      // Check if it's an abort error (timeout)
      const isAbortError = error.name === 'AbortError';
      const errorMessage = isAbortError
        ? 'Connection to streaming service timed out'
        : 'Failed to connect to streaming service';
      const errorCode = isAbortError ? 'TIMEOUT_ERROR' : 'CONNECTION_ERROR';

      // Create a more detailed error response
      return new Response(
        JSON.stringify({
          error: errorMessage,
          errorCode: errorCode,
          details: error.message || 'Unknown error',
          jobId: jobId
        }),
        {
          status: isAbortError ? 504 : 500, // Use 504 Gateway Timeout for timeouts
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

  } catch (error: any) {
    console.error('❌ ERROR - Error in proxy/generate/stream:', error);

    // Create a detailed error response for the outer catch block
    const errorDetails = {
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    return new Response(
      JSON.stringify({
        error: 'Internal server error in streaming service',
        errorCode: 'SERVER_ERROR',
        details: errorDetails
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}