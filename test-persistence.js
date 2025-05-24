#!/usr/bin/env node

/**
 * Comprehensive test script for persistent project state
 * Tests both chat message and canvas image persistence
 */

const BASE_URL = 'http://localhost:3000';

async function makeRequest(url, options = {}) {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function testPersistence() {
  console.log('🧪 Starting comprehensive persistence test...\n');

  try {
    // Step 1: Create a new project
    console.log('📝 Step 1: Creating a new project...');
    const projectResponse = await makeRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Persistence Project',
        description: 'Testing complete persistence functionality',
        thumbnail_url: '',
      }),
    });

    const projectId = projectResponse.project_id;
    console.log(`✅ Project created: ${projectId}\n`);

    // Step 2: Add multiple chat messages
    console.log('💬 Step 2: Adding chat messages...');
    const messages = [
      { role: 'user', content: 'Hello, this is my first message!' },
      { role: 'assistant', content: 'Hi there! I received your message.' },
      { role: 'user', content: 'Can you help me create some ads?' },
      { role: 'assistant', content: 'Of course! I\'d be happy to help you create ads.' },
    ];

    const createdMessages = [];
    for (const [index, message] of messages.entries()) {
      const response = await makeRequest(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify(message),
      });
      createdMessages.push(response.message);
      console.log(`✅ Message ${index + 1} created: ${response.message.id}`);
    }

    // Step 3: Add canvas objects (images)
    console.log('\n🎨 Step 3: Adding canvas objects...');
    const canvasObjects = [
      {
        type: 'image',
        x: 50,
        y: 50,
        width: 512,
        height: 512,
        src: 'https://via.placeholder.com/512x512/FF0000/FFFFFF?text=Image+1',
      },
      {
        type: 'image',
        x: 600,
        y: 50,
        width: 512,
        height: 512,
        src: 'https://via.placeholder.com/512x512/00FF00/FFFFFF?text=Image+2',
      },
      {
        type: 'text',
        x: 100,
        y: 600,
        width: 300,
        height: 60,
        props: {
          text: 'Test Canvas Text',
          fontSize: 24,
          fill: '#333333',
        },
      },
    ];

    const createdObjects = [];
    for (const [index, obj] of canvasObjects.entries()) {
      const response = await makeRequest(`/api/projects/${projectId}/canvas`, {
        method: 'POST',
        body: JSON.stringify(obj),
      });
      createdObjects.push(response.object);
      console.log(`✅ Canvas object ${index + 1} created: ${response.object.id}`);
    }

    // Step 4: Verify data was saved correctly
    console.log('\n🔍 Step 4: Verifying saved data...');

    // Check chat messages
    const chatResponse = await makeRequest(`/api/projects/${projectId}/chat`);
    console.log(`✅ Retrieved ${chatResponse.messages.length} chat messages`);
    
    if (chatResponse.messages.length !== messages.length) {
      throw new Error(`Expected ${messages.length} messages, got ${chatResponse.messages.length}`);
    }

    // Verify message order and content
    for (const [index, message] of chatResponse.messages.entries()) {
      const expected = messages[index];
      if (message.role !== expected.role || message.content !== expected.content) {
        throw new Error(`Message ${index + 1} content mismatch`);
      }
    }
    console.log('✅ All chat messages verified correctly');

    // Check canvas objects
    const canvasResponse = await makeRequest(`/api/projects/${projectId}/canvas`);
    console.log(`✅ Retrieved ${canvasResponse.objects.length} canvas objects`);
    
    if (canvasResponse.objects.length !== canvasObjects.length) {
      throw new Error(`Expected ${canvasObjects.length} objects, got ${canvasResponse.objects.length}`);
    }

    // Verify object positions and properties
    for (const [index, obj] of canvasResponse.objects.entries()) {
      const expected = canvasObjects[index];
      if (obj.x !== expected.x || obj.y !== expected.y || obj.type !== expected.type) {
        throw new Error(`Canvas object ${index + 1} position/type mismatch`);
      }
    }
    console.log('✅ All canvas objects verified correctly');

    // Step 5: Test project hydration simulation
    console.log('\n🔄 Step 5: Testing project state hydration...');
    
    // Simulate what happens when a user reopens a project
    const hydratedChat = await makeRequest(`/api/projects/${projectId}/chat`);
    const hydratedCanvas = await makeRequest(`/api/projects/${projectId}/canvas`);
    
    console.log(`✅ Hydrated ${hydratedChat.messages.length} chat messages`);
    console.log(`✅ Hydrated ${hydratedCanvas.objects.length} canvas objects`);

    // Verify order is preserved
    const firstMessage = hydratedChat.messages[0];
    const lastMessage = hydratedChat.messages[hydratedChat.messages.length - 1];
    
    if (firstMessage.content !== messages[0].content) {
      throw new Error('Message order not preserved - first message incorrect');
    }
    
    if (lastMessage.content !== messages[messages.length - 1].content) {
      throw new Error('Message order not preserved - last message incorrect');
    }
    
    console.log('✅ Message order preserved correctly');

    // Verify canvas object positions are exact
    const firstObject = hydratedCanvas.objects[0];
    const expectedFirst = canvasObjects[0];
    
    if (firstObject.x !== expectedFirst.x || firstObject.y !== expectedFirst.y) {
      throw new Error(`Canvas object position not preserved: expected (${expectedFirst.x}, ${expectedFirst.y}), got (${firstObject.x}, ${firstObject.y})`);
    }
    
    console.log('✅ Canvas object positions preserved exactly');

    // Step 6: Test complete project state
    console.log('\n📊 Step 6: Final verification...');
    
    const projectDetails = await makeRequest(`/api/projects/${projectId}`);
    console.log(`✅ Project details retrieved: ${projectDetails.project.name}`);
    
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('\n📋 Test Summary:');
    console.log(`   • Project ID: ${projectId}`);
    console.log(`   • Chat messages: ${hydratedChat.messages.length} saved and loaded`);
    console.log(`   • Canvas objects: ${hydratedCanvas.objects.length} saved and loaded`);
    console.log(`   • Message order: ✅ Preserved`);
    console.log(`   • Object positions: ✅ Exact`);
    console.log(`   • Project URL: ${BASE_URL}/playground/${projectId}`);
    
    return {
      success: true,
      projectId,
      chatMessages: hydratedChat.messages.length,
      canvasObjects: hydratedCanvas.objects.length,
      playgroundUrl: `/playground/${projectId}`,
    };

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the test
if (require.main === module) {
  testPersistence()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testPersistence };
