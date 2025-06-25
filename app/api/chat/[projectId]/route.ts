import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/chat/[projectId] - Get chat history for a project
 * This route provides compatibility with the documented API structure
 * while maintaining the current individual messages approach
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;

    console.log('[API] [Chat Compat] Fetching chat history for project:', projectId);

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (projectError || !project) {
      console.error('[API] [Chat Compat] Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Fetch chat messages from individual messages table
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API] [Chat Compat] Supabase error fetching chat messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chat messages' },
        { status: 500 }
      );
    }

    // Convert to the format expected by the documentation
    const chatHistory = messages?.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.created_at,
      type: msg.message_type || 'text',
      imageUrls: msg.image_urls || [],
    })) || [];

    console.log(`[API] [Chat Compat] Successfully fetched ${chatHistory.length} messages`);

    // Return in the documented format (array of messages)
    return NextResponse.json(chatHistory);

  } catch (error) {
    console.error('[API] [Chat Compat] Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/[projectId] - Update chat history for a project
 * This route provides compatibility with the documented API structure
 * Accepts an array of messages and saves them individually
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { messages } = body as { messages: any[] };

    console.log('[API] [Chat Compat] Updating chat history for project:', projectId);
    console.log('[API] [Chat Compat] Received messages count:', messages?.length || 0);

    // Validate input
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'messages must be an array' },
        { status: 400 }
      );
    }

    // First verify the project exists and belongs to the user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', 'default-user')
      .single();

    if (projectError || !project) {
      console.error('[API] [Chat Compat] Project not found:', projectError);
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // For now, we'll implement a simple approach:
    // Clear existing messages and insert new ones
    // In a production system, you'd want more sophisticated conflict resolution

    // Delete existing messages
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      console.error('[API] [Chat Compat] Error deleting existing messages:', deleteError);
      return NextResponse.json(
        { error: 'Failed to clear existing messages' },
        { status: 500 }
      );
    }

    // Insert new messages
    if (messages.length > 0) {
      const messagesToInsert = messages.map((msg: any) => ({
        project_id: projectId,
        role: msg.role,
        content: msg.content,
        image_urls: msg.imageUrls || msg.image_urls || [],
        message_type: msg.type || msg.message_type || 'text',
        // Preserve timestamp if provided, otherwise use current time
        created_at: msg.timestamp || new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert);

      if (insertError) {
        console.error('[API] [Chat Compat] Error inserting messages:', insertError);
        return NextResponse.json(
          { error: 'Failed to save messages' },
          { status: 500 }
        );
      }
    }

    console.log('[API] [Chat Compat] Successfully updated chat history');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] [Chat Compat] Error updating chat history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
