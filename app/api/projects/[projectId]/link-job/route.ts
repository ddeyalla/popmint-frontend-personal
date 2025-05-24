import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/projects/[projectId]/link-job - Link a job ID to a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { job_id } = body;

    // Validate required fields
    if (!job_id) {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      );
    }

    console.log('[API] Linking job to project:', { projectId, job_id });

    // First, verify the project exists and belongs to the user
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

    // Check if job is already linked
    const { data: existingJob } = await supabase
      .from('project_jobs')
      .select('job_id')
      .eq('project_id', projectId)
      .single();

    if (existingJob) {
      console.log('[API] Job already linked to project:', existingJob.job_id);
      return NextResponse.json(
        { error: 'Project already has a linked job' },
        { status: 409 }
      );
    }

    // Link the job to the project
    const { data, error } = await supabase
      .from('project_jobs')
      .insert([{
        project_id: projectId,
        job_id: job_id,
      }])
      .select()
      .single();

    if (error) {
      console.error('[API] Supabase error linking job:', error);
      return NextResponse.json(
        { error: 'Failed to link job to project' },
        { status: 500 }
      );
    }

    console.log('[API] Job linked successfully:', data);
    return NextResponse.json({ success: true, job_link: data });

  } catch (error) {
    console.error('[API] Error linking job to project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[projectId]/link-job - Get the linked job for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Getting linked job for project:', projectId);

    const { data, error } = await supabase
      .from('project_jobs')
      .select('job_id, created_at')
      .eq('project_id', projectId)
      .single();

    if (error) {
      console.error('[API] Supabase error getting linked job:', error);
      return NextResponse.json(
        { error: 'No linked job found' },
        { status: 404 }
      );
    }

    console.log('[API] Linked job found:', data.job_id);
    return NextResponse.json({ job_id: data.job_id, linked_at: data.created_at });

  } catch (error) {
    console.error('[API] Error getting linked job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
