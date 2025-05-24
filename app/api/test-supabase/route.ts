import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/test-supabase - Test Supabase connection and basic operations
export async function GET() {
  try {
    console.log('[TEST] Testing Supabase connection...');

    // Test 1: Create a test project
    const testProject = {
      name: 'Test Project',
      description: 'Test project for Supabase connection',
      thumbnail_url: '',
      user_id: 'default-user',
    };

    console.log('[TEST] Creating test project...');
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert([testProject])
      .select()
      .single();

    if (createError) {
      console.error('[TEST] Error creating project:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create test project',
        details: createError,
      }, { status: 500 });
    }

    console.log('[TEST] Project created:', project.id);

    // Test 2: Create a test chat message
    const testMessage = {
      project_id: project.id,
      role: 'user',
      content: 'Test message',
      image_urls: [],
      message_type: 'text',
    };

    console.log('[TEST] Creating test chat message...');
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert([testMessage])
      .select()
      .single();

    if (messageError) {
      console.error('[TEST] Error creating message:', messageError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create test message',
        details: messageError,
      }, { status: 500 });
    }

    console.log('[TEST] Message created:', message.id);

    // Test 3: Create a test canvas object
    const testObject = {
      project_id: project.id,
      type: 'text',
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      rotation: 0,
      src: null,
      props: { text: 'Test text', fontSize: 16 },
    };

    console.log('[TEST] Creating test canvas object...');
    const { data: canvasObject, error: objectError } = await supabase
      .from('canvas_objects')
      .insert([testObject])
      .select()
      .single();

    if (objectError) {
      console.error('[TEST] Error creating canvas object:', objectError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create test canvas object',
        details: objectError,
      }, { status: 500 });
    }

    console.log('[TEST] Canvas object created:', canvasObject.id);

    // Test 4: Read back the data
    console.log('[TEST] Reading back data...');
    const { data: projects, error: readError } = await supabase
      .from('projects')
      .select(`
        *,
        chat_messages(*),
        canvas_objects(*)
      `)
      .eq('id', project.id)
      .single();

    if (readError) {
      console.error('[TEST] Error reading data:', readError);
      return NextResponse.json({
        success: false,
        error: 'Failed to read test data',
        details: readError,
      }, { status: 500 });
    }

    // Test 5: Clean up test data
    console.log('[TEST] Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    if (deleteError) {
      console.error('[TEST] Error deleting test data:', deleteError);
      // Don't fail the test for cleanup errors
    }

    console.log('[TEST] All tests passed!');
    return NextResponse.json({
      success: true,
      message: 'Supabase connection and operations working correctly',
      testResults: {
        projectCreated: !!project,
        messageCreated: !!message,
        canvasObjectCreated: !!canvasObject,
        dataRead: !!projects,
        chatMessagesCount: projects.chat_messages?.length || 0,
        canvasObjectsCount: projects.canvas_objects?.length || 0,
      },
    });

  } catch (error) {
    console.error('[TEST] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during testing',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
