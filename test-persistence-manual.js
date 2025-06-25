// Manual test script to verify persistence is working
// Run this in the browser console on the playground page

console.log('🧪 Starting manual persistence test...');

// Test project ID from the logs
const projectId = '12d8070e-aa05-43c2-b3ef-717649f35db4';

async function testPersistence() {
  try {
    console.log('📝 Step 1: Adding a test chat message...');
    
    // Add a test message via API
    const messageResponse = await fetch(`/api/projects/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'user',
        content: 'This is a test message to verify persistence!',
        image_urls: [],
        message_type: 'text'
      })
    });
    
    const messageData = await messageResponse.json();
    console.log('✅ Message created:', messageData.message.id);
    
    console.log('🎨 Step 2: Adding a test canvas object...');
    
    // Add a test canvas object via API
    const canvasResponse = await fetch(`/api/projects/${projectId}/canvas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        x: 150,
        y: 150,
        width: 200,
        height: 50,
        rotation: 0,
        props: {
          text: 'Test Canvas Object',
          fontSize: 18,
          fill: '#000000'
        }
      })
    });
    
    const canvasData = await canvasResponse.json();
    console.log('✅ Canvas object created:', canvasData.object.id);
    
    console.log('🔍 Step 3: Verifying data was saved...');
    
    // Verify chat messages
    const chatCheckResponse = await fetch(`/api/projects/${projectId}/chat`);
    const chatCheckData = await chatCheckResponse.json();
    console.log(`✅ Found ${chatCheckData.messages.length} chat messages`);
    
    // Verify canvas objects
    const canvasCheckResponse = await fetch(`/api/projects/${projectId}/canvas`);
    const canvasCheckData = await canvasCheckResponse.json();
    console.log(`✅ Found ${canvasCheckData.objects.length} canvas objects`);
    
    if (chatCheckData.messages.length > 0 && canvasCheckData.objects.length > 0) {
      console.log('🎉 PERSISTENCE TEST PASSED! Data was saved successfully.');
      console.log('📋 Next steps:');
      console.log('1. Refresh this page and verify the data loads');
      console.log('2. Open this URL in a new tab and verify the data appears');
      console.log('3. Add more data via the UI and verify it persists');
    } else {
      console.log('❌ PERSISTENCE TEST FAILED! Data was not saved properly.');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testPersistence();
