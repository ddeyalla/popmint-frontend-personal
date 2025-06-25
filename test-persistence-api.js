// Test script to verify persistence functionality
// Run this in the browser console

async function testPersistence() {
  console.log('🧪 Starting persistence test...');
  
  try {
    // Test 1: Create a new project
    console.log('📝 Test 1: Creating new project...');
    const createResponse = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Test project for persistence verification',
        thumbnail_url: '',
      }),
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create project: ${createResponse.status}`);
    }
    
    const createData = await createResponse.json();
    const projectId = createData.project_id;
    console.log('✅ Project created:', projectId);
    
    // Test 2: Add a chat message
    console.log('💬 Test 2: Adding chat message...');
    const messageResponse = await fetch(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'user',
        content: 'Test message for persistence',
        image_urls: [],
        message_type: 'text',
      }),
    });
    
    if (!messageResponse.ok) {
      throw new Error(`Failed to add message: ${messageResponse.status}`);
    }
    
    const messageData = await messageResponse.json();
    console.log('✅ Message added:', messageData.message.id);
    
    // Test 3: Add a canvas object
    console.log('🎨 Test 3: Adding canvas object...');
    const canvasResponse = await fetch(`/api/projects/${projectId}/canvas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        rotation: 0,
        props: {
          text: 'Test canvas object',
          fontSize: 16,
          fontFamily: 'Arial',
          fill: '#000000',
        },
      }),
    });
    
    if (!canvasResponse.ok) {
      throw new Error(`Failed to add canvas object: ${canvasResponse.status}`);
    }
    
    const canvasData = await canvasResponse.json();
    console.log('✅ Canvas object added:', canvasData.object.id);
    
    // Test 4: Retrieve chat messages
    console.log('📖 Test 4: Retrieving chat messages...');
    const getChatResponse = await fetch(`/api/projects/${projectId}/chat`);
    
    if (!getChatResponse.ok) {
      throw new Error(`Failed to get messages: ${getChatResponse.status}`);
    }
    
    const chatData = await getChatResponse.json();
    console.log('✅ Messages retrieved:', chatData.messages.length);
    
    // Test 5: Retrieve canvas objects
    console.log('🎨 Test 5: Retrieving canvas objects...');
    const getCanvasResponse = await fetch(`/api/projects/${projectId}/canvas`);
    
    if (!getCanvasResponse.ok) {
      throw new Error(`Failed to get canvas objects: ${getCanvasResponse.status}`);
    }
    
    const canvasObjectsData = await getCanvasResponse.json();
    console.log('✅ Canvas objects retrieved:', canvasObjectsData.objects.length);
    
    console.log('🎉 All persistence tests passed!');
    console.log('📋 Test Results:');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Messages: ${chatData.messages.length}`);
    console.log(`   Canvas Objects: ${canvasObjectsData.objects.length}`);
    
    return {
      success: true,
      projectId,
      messageCount: chatData.messages.length,
      canvasObjectCount: canvasObjectsData.objects.length,
    };
    
  } catch (error) {
    console.error('❌ Persistence test failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
testPersistence().then(result => {
  console.log('🏁 Test completed:', result);
});
