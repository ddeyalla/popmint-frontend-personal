import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{
    projectId: string;
  }>;
}

// POST /api/projects/[projectId]/ensure - Ensure a project exists with the given ID
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { name, description, thumbnail_url } = body;

    console.log('[API] Ensuring project exists:', projectId);

    // First, check if the project already exists by session_id
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('session_id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (existingProject && !fetchError) {
      console.log('[API] Project already exists:', existingProject.id);
      return NextResponse.json({
        project_id: existingProject.id,
        project: existingProject,
        created: false
      });
    }

    // Project doesn't exist, create it and then update with session_id
    const projectData = {
      name: name || `Project ${projectId.substring(0, 8)}`,
      description: description || 'Auto-created project from session',
      thumbnail_url: thumbnail_url || '',
      user_id: 'default-user',
      session_id: projectId, // Store the sessionId in session_id field
    };

    console.log('[API] Creating project with session_id:', projectData);

    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) {
      console.error('[API] Supabase error creating project:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    console.log('[API] Project created successfully:', data.id);
    return NextResponse.json({
      project_id: data.id,
      project: data,
      created: true
    });

  } catch (error) {
    console.error('[API] Error ensuring project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
