import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[projectId] - Get a specific project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Fetching project:', projectId);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (error) {
      console.error('[API] Supabase error fetching project:', error);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('[API] Project fetched successfully:', data.id);
    return NextResponse.json({ project: data });

  } catch (error) {
    console.error('[API] Error fetching project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId] - Update a project
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();

    console.log('[API] Updating project:', projectId, body);

    // Update the project
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .select()
      .single();

    if (error) {
      console.error('[API] Supabase error updating project:', error);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }

    console.log('[API] Project updated successfully:', data.id);
    return NextResponse.json({ project: data });

  } catch (error) {
    console.error('[API] Error updating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Deleting project:', projectId);

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', 'default-user');

    if (error) {
      console.error('[API] Supabase error deleting project:', error);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    console.log('[API] Project deleted successfully:', projectId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
