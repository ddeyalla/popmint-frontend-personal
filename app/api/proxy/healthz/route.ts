import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// URL of the backend service
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  console.log('🔍 DEBUG - /api/proxy/healthz GET request received');
  
  try {
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/healthz`, {
      method: 'GET',
      cache: 'no-store',
    });
    
    // If the backend doesn't respond with 200 OK
    if (!response.ok) {
      console.error(`❌ ERROR - Backend health check failed with status ${response.status}`);
      return new Response('Backend service unavailable', { 
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=UTF-8',
        }
      });
    }
    
    // Get the response text
    const text = await response.text();
    console.log('✅ SUCCESS - Backend health check successful');
    
    // Return the response with the same content type
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
      }
    });
    
  } catch (error: any) {
    console.error('❌ ERROR - Backend health check failed:', error);
    
    return new Response('Backend service unreachable', { 
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
      }
    });
  }
} 