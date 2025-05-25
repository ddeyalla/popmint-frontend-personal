import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// URL of the backend service
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  console.log('🔍 DEBUG - /api/proxy/generate POST request received');

  try {
    // Parse the request body
    const body = await req.json();
    const { job_id, product_url, n_images } = body;

    if (!product_url) {
      console.error('❌ ERROR - product_url is missing in request body:', body);
      return NextResponse.json(
        { error: 'product_url is required', errorCode: 'MISSING_PRODUCT_URL' },
        { status: 400 }
      );
    }

    // job_id is stored for later use but not sent to the backend
    // as the backend will generate its own job_id

    console.log('🔍 DEBUG - Processing request for product URL:', product_url, 'with n_images:', n_images || 4);
    console.log('🔍 DEBUG - Backend URL:', BACKEND_URL);

    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_url,
        n_images: n_images || 4
      }),
    });

    // Handle non-success responses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Unknown backend error', errorCode: 'BACKEND_ERROR' };
      }

      console.error(`❌ ERROR - Backend responded with status ${response.status}:`, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Forward the successful response
    const data = await response.json();
    console.log('✅ SUCCESS - Ad generation job created with ID:', data.job_id);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('❌ ERROR - Error in proxy/generate:', error);

    return NextResponse.json(
      {
        error: 'Failed to connect to ad generation service',
        errorCode: 'CONNECTION_ERROR',
        details: error.message
      },
      { status: 500 }
    );
  }
}