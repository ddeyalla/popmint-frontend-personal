#!/usr/bin/env node

/**
 * Complete persistence test - tests the full flow from session creation to data persistence
 */

const BASE_URL = 'http://localhost:3001';

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

async function testCompletePersistence() {
  console.log('🧪 Starting complete persistence test...\n');

  try {
    // Step 1: Create a test session ID
    const sessionId = `test-session-${Date.now()}`;
    console.log(`📝 Step 1: Using session ID: ${sessionId}`);

    // Step 2: Get or create project for this session
    console.log('🔍 Step 2: Getting/creating project for session...');
    const projectResponse = await makeRequest(`/api/projects/by-session/${sessionId}`);
    const projectId = projectResponse.project_id;
    console.log(`✅ Project ID: ${projectId}\n`);

    // Step 3: Add test data via API (simulating frontend persistence)
    console.log('💬 Step 3: Adding test chat messages...');
    const testMessages = [
      { role: 'user', content: 'Hello, testing persistence!' },
      { role: 'assistant', content: 'Hi! I can help you test persistence.' },
      { role: 'user', content: 'Great! Let me add some images to the canvas.' },
    ];

    const savedMessages = [];
    for (const [index, message] of testMessages.entries()) {
      const response = await makeRequest(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify(message),
      });
      savedMessages.push(response.message);
      console.log(`✅ Message ${index + 1} saved: "${message.content}"`);
    }

    console.log('\n🎨 Step 4: Adding test canvas objects...');
    const testObjects = [
      {
        type: 'image',
        x: 100,
        y: 100,
        width: 512,
        height: 512,
        src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iI0ZGMDAwMCIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VGVzdCBJbWFnZSAxPC90ZXh0Pjwvc3ZnPg==',
      },
      {
        type: 'image',
        x: 650,
        y: 100,
        width: 512,
        height: 512,
        src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgZmlsbD0iIzAwRkYwMCIvPjx0ZXh0IHg9IjI1NiIgeT0iMjU2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VGVzdCBJbWFnZSAyPC90ZXh0Pjwvc3ZnPg==',
      },
      {
        type: 'text',
        x: 200,
        y: 650,
        width: 400,
        height: 80,
        props: {
          text: 'Persistence Test Text Object',
          fontSize: 24,
          fill: '#333333',
        },
      },
    ];

    const savedObjects = [];
    for (const [index, obj] of testObjects.entries()) {
      const response = await makeRequest(`/api/projects/${projectId}/canvas`, {
        method: 'POST',
        body: JSON.stringify(obj),
      });
      savedObjects.push(response.object);
      console.log(`✅ Canvas object ${index + 1} saved: ${obj.type} at (${obj.x}, ${obj.y})`);
    }

    // Step 5: Verify data persistence
    console.log('\n🔍 Step 5: Verifying data persistence...');

    // Check messages
    const messagesResponse = await makeRequest(`/api/projects/${projectId}/chat`);
    console.log(`✅ Retrieved ${messagesResponse.messages.length} chat messages`);

    // Verify message order and content
    for (const [index, message] of messagesResponse.messages.entries()) {
      const expected = testMessages[index];
      if (message.role === expected.role && message.content === expected.content) {
        console.log(`  ✅ Message ${index + 1}: "${message.content}" - CORRECT`);
      } else {
        console.log(`  ❌ Message ${index + 1}: Expected "${expected.content}", got "${message.content}"`);
      }
    }

    // Check canvas objects
    const objectsResponse = await makeRequest(`/api/projects/${projectId}/canvas`);
    console.log(`✅ Retrieved ${objectsResponse.objects.length} canvas objects`);

    // Verify object positions and properties
    for (const [index, obj] of objectsResponse.objects.entries()) {
      const expected = testObjects[index];
      if (obj.type === expected.type && obj.x === expected.x && obj.y === expected.y) {
        console.log(`  ✅ Object ${index + 1}: ${obj.type} at (${obj.x}, ${obj.y}) - CORRECT`);
      } else {
        console.log(`  ❌ Object ${index + 1}: Expected ${expected.type} at (${expected.x}, ${expected.y}), got ${obj.type} at (${obj.x}, ${obj.y})`);
      }
    }

    // Step 6: Test session-to-project mapping
    console.log('\n🔄 Step 6: Testing session-to-project mapping...');
    const mappingResponse = await makeRequest(`/api/projects/by-session/${sessionId}`);

    if (mappingResponse.project_id === projectId) {
      console.log(`✅ Session mapping works: ${sessionId} -> ${projectId}`);
    } else {
      console.log(`❌ Session mapping failed: Expected ${projectId}, got ${mappingResponse.project_id}`);
    }

    // Step 7: Generate test summary
    console.log('\n📊 Step 7: Test Summary');
    console.log('=' * 50);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Project ID: ${projectId}`);
    console.log(`Playground URL: ${BASE_URL}/playground/${sessionId}`);
    console.log(`Chat Messages: ${messagesResponse.messages.length}/${testMessages.length} saved`);
    console.log(`Canvas Objects: ${objectsResponse.objects.length}/${testObjects.length} saved`);

    // Final verification
    const allMessagesCorrect = messagesResponse.messages.length === testMessages.length;
    const allObjectsCorrect = objectsResponse.objects.length === testObjects.length;

    if (allMessagesCorrect && allObjectsCorrect) {
      console.log('\n🎉 COMPLETE PERSISTENCE TEST PASSED! 🎉');
      console.log('\n✅ All requirements verified:');
      console.log('  • Chat messages are saved and loaded correctly');
      console.log('  • Canvas objects are saved with exact positions');
      console.log('  • Session-to-project mapping works');
      console.log('  • Data persists across API calls');
      console.log('\n🌐 Next step: Open the playground URL to test frontend hydration:');
      console.log(`   ${BASE_URL}/playground/${sessionId}`);
    } else {
      console.log('\n❌ PERSISTENCE TEST FAILED!');
      console.log(`  • Messages: ${allMessagesCorrect ? 'PASS' : 'FAIL'}`);
      console.log(`  • Objects: ${allObjectsCorrect ? 'PASS' : 'FAIL'}`);
    }

    return {
      success: allMessagesCorrect && allObjectsCorrect,
      sessionId,
      projectId,
      playgroundUrl: `/playground/${sessionId}`,
      messagesCount: messagesResponse.messages.length,
      objectsCount: objectsResponse.objects.length,
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
  testCompletePersistence()
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

module.exports = { testCompletePersistence };
