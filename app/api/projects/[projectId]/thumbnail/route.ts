import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

// POST /api/projects/[projectId]/thumbnail - Upload thumbnail for a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Uploading thumbnail for project:', projectId);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get the request body as array buffer
    const arrayBuffer = await request.arrayBuffer();
    const blob = new Uint8Array(arrayBuffer);

    console.log('[API] Received thumbnail blob:', {
      size: blob.length,
      sizeKB: Math.round(blob.length / 1024),
    });

    // Validate blob size (max 200KB as per requirements)
    if (blob.length > 200 * 1024) {
      return NextResponse.json(
        { error: 'Thumbnail too large. Maximum size is 200KB.' },
        { status: 413 }
      );
    }

    // Validate blob is not empty
    if (blob.length === 0) {
      return NextResponse.json(
        { error: 'Empty thumbnail data' },
        { status: 400 }
      );
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (projectError || !project) {
      console.error('[API] Project not found or access denied:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Upload to Supabase Storage
    const fileName = `${projectId}.jpg`;
    const filePath = `project-thumbnails/${fileName}`;

    console.log('[API] Uploading to Supabase Storage:', filePath);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-thumbnails')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true, // Replace existing file if it exists
      });

    if (uploadError) {
      console.error('[API] Supabase Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload thumbnail to storage' },
        { status: 500 }
      );
    }

    console.log('[API] Upload successful:', uploadData);

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('project-thumbnails')
      .getPublicUrl(filePath);

    const thumbnailUrl = urlData.publicUrl;
    console.log('[API] Generated public URL:', thumbnailUrl);

    // Update project with thumbnail URL and timestamp
    const now = new Date().toISOString();
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        thumbnail_url: thumbnailUrl,
        thumbnail_updated_at: now,
        updated_at: now,
      })
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating project with thumbnail URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to update project with thumbnail URL' },
        { status: 500 }
      );
    }

    console.log('[API] Project updated successfully with thumbnail URL');

    return NextResponse.json({
      thumbnail_url: thumbnailUrl,
      updated_at: now,
      project: updatedProject,
    });

  } catch (error) {
    console.error('[API] Unexpected error uploading thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[projectId]/thumbnail - Get thumbnail URL for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Getting thumbnail for project:', projectId);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project with thumbnail info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, thumbnail_url, thumbnail_updated_at')
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

    return NextResponse.json({
      thumbnail_url: project.thumbnail_url,
      thumbnail_updated_at: project.thumbnail_updated_at,
    });

  } catch (error) {
    console.error('[API] Unexpected error getting thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/thumbnail - Delete thumbnail for a project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Deleting thumbnail for project:', projectId);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (projectError || !project) {
      console.error('[API] Project not found or access denied:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete from Supabase Storage
    const fileName = `${projectId}.jpg`;
    const filePath = `project-thumbnails/${fileName}`;

    console.log('[API] Deleting from Supabase Storage:', filePath);

    const { error: deleteError } = await supabase.storage
      .from('project-thumbnails')
      .remove([filePath]);

    if (deleteError) {
      console.warn('[API] Error deleting from storage (may not exist):', deleteError);
      // Don't fail the request if file doesn't exist
    }

    // Update project to remove thumbnail URL
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        thumbnail_url: null,
        thumbnail_updated_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating project to remove thumbnail:', updateError);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    console.log('[API] Thumbnail deleted successfully');

    return NextResponse.json({
      success: true,
      project: updatedProject,
    });

  } catch (error) {
    console.error('[API] Unexpected error deleting thumbnail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
