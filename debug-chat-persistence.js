// Debug script to test chat persistence
// Run this in browser console to debug the issue

async function debugChatPersistence() {
  console.log('🔍 DEBUGGING CHAT PERSISTENCE');
  
  // 1. Check current project ID
  const projectStore = window.__NEXT_REDUX_WRAPPER_STORE__ || {};
  const currentProjectId = localStorage.getItem('popmint-projects-storage');
  console.log('📊 Current Project ID from localStorage:', currentProjectId);
  
  // Try to get project ID from URL
  const urlProjectId = window.location.pathname.split('/')[2];
  console.log('📊 Project ID from URL:', urlProjectId);
  
  // 2. Test API directly
  const testProjectId = urlProjectId || 'test-project-id';
  console.log('🧪 Testing with project ID:', testProjectId);
  
  try {
    // Test GET /api/projects/{projectId}/chat
    console.log('🌐 Testing GET /api/projects/' + testProjectId + '/chat');
    const response = await fetch(`/api/projects/${testProjectId}/chat`);
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📥 Response data:', data);
      console.log('💬 Messages count:', data.messages?.length || 0);
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
    }
  } catch (error) {
    console.error('💥 Fetch error:', error);
  }
  
  // 3. Test POST to save a message
  try {
    console.log('🧪 Testing POST to save a message');
    const testMessage = {
      role: 'user',
      content: 'Debug test message',
      image_urls: [],
      message_type: 'text'
    };
    
    const postResponse = await fetch(`/api/projects/${testProjectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });
    
    console.log('📡 POST Response status:', postResponse.status);
    
    if (postResponse.ok) {
      const postData = await postResponse.json();
      console.log('📥 POST Response data:', postData);
    } else {
      const errorText = await postResponse.text();
      console.error('❌ POST API Error:', errorText);
    }
  } catch (error) {
    console.error('💥 POST Fetch error:', error);
  }
  
  // 4. Check chat store state
  if (window.useChatStore) {
    const chatState = window.useChatStore.getState();
    console.log('💬 Chat Store State:', {
      messageCount: chatState.messages?.length || 0,
      messages: chatState.messages?.map(m => ({
        id: m.id,
        role: m.role,
        type: m.type,
        contentLength: m.content?.length || 0
      })) || []
    });
  }
  
  // 5. Check SWR cache
  console.log('🔍 Checking SWR cache...');
  // This would require access to SWR internals
  
  console.log('✅ Debug complete');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  debugChatPersistence();
}
