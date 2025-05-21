import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// URL of the backend service
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;
  
  console.log('🔍 DEBUG - /api/proxy/cancel POST request received for job ID:', jobId);
  
  try {
    if (!jobId) {
      console.error('❌ ERROR - Missing job ID in request params');
      return NextResponse.json(
        { error: 'Missing job ID', errorCode: 'MISSING_JOB_ID' },
        { status: 400 }
      );
    }
    
    // Forward the cancellation request to the backend
    const response = await fetch(`${BACKEND_URL}/cancel/${jobId}`, {
      method: 'POST',
    });
    
    // Handle non-success responses
    if (!response.ok) {
      if (response.status === 404) {
        console.error('❌ ERROR - Job not found:', jobId);
        return NextResponse.json(
          { error: 'job_not_found', errorCode: 'JOB_NOT_FOUND' },
          { status: 404 }
        );
      }
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Unknown backend error', errorCode: 'BACKEND_ERROR' };
      }
      
      console.error(`❌ ERROR - Backend responded with status ${response.status}:`, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }
    
    // Return the successful response
    const data = await response.json();
    console.log('✅ SUCCESS - Job cancellation request accepted for job ID:', jobId);
    
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('❌ ERROR - Error in proxy/cancel:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to cancel job', 
        errorCode: 'CANCEL_ERROR',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 