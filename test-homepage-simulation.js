const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testHomepageSimulation() {
  console.log('🧪 Testing Homepage Simulation...');

  try {
    // Step 1: Create a project (like homepage does)
    console.log('📍 Step 1: Creating a project...');

    const projectResponse = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Homepage Simulation',
        description: 'Testing homepage simulation flow',
        thumbnail_url: '',
        user_id: 'default-user'
      })
    });

    if (!projectResponse.ok) {
      throw new Error(`Failed to create project: ${projectResponse.status}`);
    }

    const project = await projectResponse.json();
    console.log('✅ Project created:', project.project_id);
    console.log('📍 Full API response:', project);

    // Step 2: Simulate localStorage setting and navigation
    console.log('📍 Step 2: Simulating localStorage and navigation...');

    const testUrl = 'https://example.com/test-product-simulation';
    const initialMessage = {
      type: 'text',
      content: testUrl,
      imageUrls: []
    };

    console.log('📍 Step 3: Would set localStorage values:');
    console.log('  - popmint-initial-message:', JSON.stringify(initialMessage));
    console.log('  - popmint-generate-ad: true');
    console.log('  - popmint-product-url:', testUrl);
    console.log('  - popmint-process-image: true');
    console.log('  - popmint-prompt-to-process:', testUrl);

    console.log('📍 Step 4: Would navigate to:', `${BASE_URL}/playground/${project.project_id}`);

    // Step 3: Test if the playground would load correctly
    console.log('📍 Step 5: Testing playground load...');

    const playgroundResponse = await fetch(`${BASE_URL}/playground/${project.project_id}`);

    if (playgroundResponse.ok) {
      console.log('✅ Playground loads successfully');
    } else {
      console.log('❌ Playground failed to load:', playgroundResponse.status);
    }

    console.log('✅ Homepage simulation test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testHomepageSimulation().catch(console.error);
