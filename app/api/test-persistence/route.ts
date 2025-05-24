import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/test-persistence - Create a test project and return the playground URL
export async function GET() {
  try {
    console.log('[TEST-PERSISTENCE] Creating test project...');

    // Create a test project
    const testProject = {
      name: 'Test Persistence Project',
      description: 'Testing persistence functionality',
      thumbnail_url: '',
      user_id: 'default-user',
    };

    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert([testProject])
      .select()
      .single();

    if (createError) {
      console.error('[TEST-PERSISTENCE] Error creating project:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create test project',
        details: createError,
      }, { status: 500 });
    }

    console.log('[TEST-PERSISTENCE] Project created:', project.id);

    // Add a test chat message
    const testMessage = {
      project_id: project.id,
      role: 'user',
      content: 'Hello, this is a test message for persistence!',
      image_urls: [],
      message_type: 'text',
    };

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert([testMessage])
      .select()
      .single();

    if (messageError) {
      console.error('[TEST-PERSISTENCE] Error creating message:', messageError);
    } else {
      console.log('[TEST-PERSISTENCE] Message created:', message.id);
    }

    // Add a test canvas object
    const testObject = {
      project_id: project.id,
      type: 'text',
      x: 150,
      y: 150,
      width: 300,
      height: 60,
      rotation: 0,
      src: null,
      props: { text: 'Test Canvas Object', fontSize: 20, fill: '#333' },
    };

    const { data: canvasObject, error: objectError } = await supabase
      .from('canvas_objects')
      .insert([testObject])
      .select()
      .single();

    if (objectError) {
      console.error('[TEST-PERSISTENCE] Error creating canvas object:', objectError);
    } else {
      console.log('[TEST-PERSISTENCE] Canvas object created:', canvasObject.id);
    }

    // Return the playground URL
    const playgroundUrl = `/playground/${project.id}`;
    
    return NextResponse.json({
      success: true,
      message: 'Test project created successfully',
      projectId: project.id,
      playgroundUrl,
      testData: {
        project: project,
        message: message || null,
        canvasObject: canvasObject || null,
      },
    });

  } catch (error) {
    console.error('[TEST-PERSISTENCE] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during testing',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
