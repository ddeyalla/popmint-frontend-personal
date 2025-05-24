import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, thumbnail_url } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Create project with default user ID (no auth for now)
    const projectData = {
      name,
      description: description || '',
      thumbnail_url: thumbnail_url || '',
      user_id: 'default-user',
    };

    console.log('[API] Creating project:', projectData);

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
    return NextResponse.json({ project_id: data.id, project: data });

  } catch (error) {
    console.error('[API] Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/projects - Get all projects for the user
export async function GET() {
  try {
    console.log('[API] Fetching projects for default user');

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', 'default-user')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[API] Supabase error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    console.log(`[API] Successfully fetched ${data?.length || 0} projects`);
    return NextResponse.json({ projects: data || [] });

  } catch (error) {
    console.error('[API] Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
