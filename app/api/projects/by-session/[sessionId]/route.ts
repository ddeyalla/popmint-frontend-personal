import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{
    sessionId: string;
  }>;
}

// GET /api/projects/by-session/[sessionId] - Get or create a project by session ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    console.log('[API] Getting project by session ID:', sessionId);

    // First, try to find an existing project with this session_id
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', 'default-user')
      .single();

    if (existingProject && !fetchError) {
      console.log('[API] Found existing project:', existingProject.id);
      return NextResponse.json({ 
        project_id: existingProject.id, 
        project: existingProject 
      });
    }

    // Project doesn't exist, create it
    const projectData = {
      name: `Project ${sessionId.substring(0, 8)}`,
      description: 'Auto-created project from session',
      thumbnail_url: '',
      user_id: 'default-user',
      session_id: sessionId,
    };

    console.log('[API] Creating new project for session:', projectData);

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
      project: data 
    });

  } catch (error) {
    console.error('[API] Error getting project by session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
