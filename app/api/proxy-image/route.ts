import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Get the image URL from the query parameter
    const url = req.nextUrl.searchParams.get('url');
    
    if (!url) {
      console.error('❌ ERROR - proxy-image: No URL provided');
      return new Response('No URL provided', { status: 400 });
    }
    
    console.log('🔍 DEBUG - proxy-image: Fetching image from:', url);
    
    // Fetch the image from the original URL
    const imageResponse = await fetch(url, {
      headers: {
        // Pass user-agent to avoid being blocked
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    
    if (!imageResponse.ok) {
      console.error(`❌ ERROR - proxy-image: Failed to fetch image, status: ${imageResponse.status}`);
      return new Response(`Failed to fetch image: ${imageResponse.statusText}`, { 
        status: imageResponse.status 
      });
    }
    
    // Get the image data
    const imageData = await imageResponse.arrayBuffer();
    
    // Get content type
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    
    console.log('✅ SUCCESS - proxy-image: Successfully proxied image');
    
    // Return the image with proper CORS headers
    return new Response(imageData, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('❌ ERROR - proxy-image:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 