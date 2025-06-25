import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[projectId]/canvas - Get all canvas objects for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Fetching canvas objects for project:', projectId);

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

    // Fetch canvas objects
    const { data, error } = await supabase
      .from('canvas_objects')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: true });

    if (error) {
      console.error('[API] Supabase error fetching canvas objects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch canvas objects' },
        { status: 500 }
      );
    }

    console.log(`[API] Successfully fetched ${data?.length || 0} canvas objects`);
    return NextResponse.json({ objects: data || [] });

  } catch (error) {
    console.error('[API] Error fetching canvas objects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/canvas - Create a new canvas object
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { type, x, y, width, height, rotation = 0, src, props = {} } = body;

    // Validate required fields
    if (!type || x === undefined || y === undefined) {
      return NextResponse.json(
        { error: 'type, x, and y are required' },
        { status: 400 }
      );
    }

    if (!['image', 'text', 'shape'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: image, text, shape' },
        { status: 400 }
      );
    }

    console.log('[API] 🔍 DEBUG: Creating canvas object for project:', projectId, {
      type,
      x,
      y,
      width,
      height,
      rotation,
      src: src ? 'present' : 'none',
      props_keys: Object.keys(props),
    });

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (projectError || !project) {
      console.error('[API] 💥 Project not found:', {
        projectId,
        error: projectError,
      });
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('[API] ✅ Project verified:', project.id);

    // Create the canvas object
    const objectData = {
      project_id: projectId,
      type,
      x,
      y,
      width,
      height,
      rotation,
      src,
      props,
    };

    console.log('[API] 🔍 DEBUG: Inserting object data:', {
      project_id: objectData.project_id,
      type: objectData.type,
      x: objectData.x,
      y: objectData.y,
      width: objectData.width,
      height: objectData.height,
    });

    const { data, error } = await supabase
      .from('canvas_objects')
      .insert([objectData])
      .select()
      .single();

    if (error) {
      console.error('[API] 💥 Supabase error creating canvas object:', {
        projectId,
        error,
        objectData: {
          ...objectData,
          props: Object.keys(objectData.props || {}),
        },
      });
      return NextResponse.json(
        { error: 'Failed to create canvas object' },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Canvas object created successfully:', {
      id: data.id,
      project_id: data.project_id,
      type: data.type,
      x: data.x,
      y: data.y,
    });
    return NextResponse.json({ object: data });

  } catch (error) {
    console.error('[API] Error creating canvas object:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
