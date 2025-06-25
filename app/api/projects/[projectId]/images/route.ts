import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type RouteParams = {
  params: Promise<{ projectId: string }>;
};

// GET /api/projects/[projectId]/images - Get first 4 images for a project in chronological order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Fetching images for project:', projectId);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (projectError || !project) {
      console.error('[API] Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Collect all images from both sources with timestamps
    const allImages: Array<{ url: string; timestamp: string; source: string }> = [];

    // 1. Get images from canvas objects (type='image')
    const { data: canvasObjects, error: canvasError } = await supabase
      .from('canvas_objects')
      .select('src, updated_at')
      .eq('project_id', projectId)
      .eq('type', 'image')
      .not('src', 'is', null)
      .order('updated_at', { ascending: true });

    if (canvasError) {
      console.error('[API] Error fetching canvas images:', canvasError);
    } else {
      canvasObjects?.forEach(obj => {
        if (obj.src) {
          allImages.push({
            url: obj.src,
            timestamp: obj.updated_at,
            source: 'canvas'
          });
        }
      });
    }

    // 2. Get images from chat messages (image_urls array)
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('image_urls, created_at')
      .eq('project_id', projectId)
      .not('image_urls', 'eq', '{}')
      .order('created_at', { ascending: true });

    if (chatError) {
      console.error('[API] Error fetching chat images:', chatError);
    } else {
      chatMessages?.forEach(msg => {
        if (msg.image_urls && Array.isArray(msg.image_urls)) {
          msg.image_urls.forEach((url: string) => {
            if (url) {
              allImages.push({
                url,
                timestamp: msg.created_at,
                source: 'chat'
              });
            }
          });
        }
      });
    }

    // Sort all images by timestamp (chronological order)
    allImages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Take first 4 images
    const firstFourImages = allImages.slice(0, 4).map(img => img.url);

    console.log(`[API] Found ${allImages.length} total images, returning first ${firstFourImages.length}`);

    return NextResponse.json({ 
      images: firstFourImages,
      total: allImages.length 
    });

  } catch (error) {
    console.error('[API] Error fetching project images:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
