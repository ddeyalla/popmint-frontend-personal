import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ projectId: string; objectId: string }>;
}

// PATCH /api/projects/[projectId]/canvas/objects/[objectId] - Update a canvas object
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, objectId } = await params;
    const body = await request.json();

    console.log('[API] Updating canvas object:', { projectId, objectId }, body);

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

    // Update the canvas object
    const { data, error } = await supabase
      .from('canvas_objects')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', objectId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('[API] Supabase error updating canvas object:', error);
      return NextResponse.json(
        { error: 'Failed to update canvas object' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Canvas object not found' },
        { status: 404 }
      );
    }

    console.log('[API] Canvas object updated successfully:', data.id);
    return NextResponse.json({ object: data });

  } catch (error) {
    console.error('[API] Error updating canvas object:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/canvas/objects/[objectId] - Delete a canvas object
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, objectId } = await params;

    console.log('[API] Deleting canvas object:', { projectId, objectId });

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

    // Delete the canvas object
    const { error } = await supabase
      .from('canvas_objects')
      .delete()
      .eq('id', objectId)
      .eq('project_id', projectId);

    if (error) {
      console.error('[API] Supabase error deleting canvas object:', error);
      return NextResponse.json(
        { error: 'Failed to delete canvas object' },
        { status: 500 }
      );
    }

    console.log('[API] Canvas object deleted successfully:', objectId);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] Error deleting canvas object:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
