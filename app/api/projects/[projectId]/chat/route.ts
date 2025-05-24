import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[projectId]/chat - Get all chat messages for a project
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] Fetching chat messages for project:', projectId);

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

    // Fetch chat messages
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API] Supabase error fetching chat messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat messages' },
        { status: 500 }
      );
    }

    console.log(`[API] Successfully fetched ${data?.length || 0} chat messages`);
    return NextResponse.json({ messages: data || [] });

  } catch (error) {
    console.error('[API] Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/chat - Create a new chat message
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { role, content, image_urls = [], message_type = 'text' } = body;

    // Validate required fields
    if (!role || !content) {
      return NextResponse.json(
        { error: 'role and content are required' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be either "user" or "assistant"' },
        { status: 400 }
      );
    }

    console.log('[API] 🔍 DEBUG: Creating chat message for project:', projectId, {
      role,
      message_type,
      content_length: content.length,
      image_urls_count: image_urls.length,
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

    // Create the chat message
    const messageData = {
      project_id: projectId,
      role,
      content,
      image_urls,
      message_type,
    };

    console.log('[API] 🔍 DEBUG: Inserting message data:', {
      project_id: messageData.project_id,
      role: messageData.role,
      message_type: messageData.message_type,
      content_length: messageData.content.length,
    });

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([messageData])
      .select()
      .single();

    if (error) {
      console.error('[API] 💥 Supabase error creating chat message:', {
        projectId,
        error,
        messageData: {
          ...messageData,
          content: `${messageData.content.substring(0, 100)}...`,
        },
      });
      return NextResponse.json(
        { error: 'Failed to create chat message' },
        { status: 500 }
      );
    }

    console.log('[API] ✅ Chat message created successfully:', {
      id: data.id,
      project_id: data.project_id,
      role: data.role,
      message_type: data.message_type,
    });
    return NextResponse.json({ message: data });

  } catch (error) {
    console.error('[API] Error creating chat message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
