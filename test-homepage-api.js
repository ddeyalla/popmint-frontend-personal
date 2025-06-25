const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testHomepageAPI() {
  console.log('🧪 Testing Homepage API Flow...');
  
  try {
    // Step 1: Create a project (simulate homepage form submission)
    console.log('📍 Step 1: Creating a new project...');
    
    const projectResponse = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Homepage Project',
        description: 'Testing homepage to playground flow',
        thumbnail_url: '',
        user_id: 'test-user'
      })
    });
    
    if (!projectResponse.ok) {
      throw new Error(`Failed to create project: ${projectResponse.status}`);
    }
    
    const project = await projectResponse.json();
    console.log('✅ Project created:', project.id);
    
    // Step 2: Test the ad generation API directly
    console.log('📍 Step 2: Testing ad generation API...');
    
    const adGenResponse = await fetch(`${BASE_URL}/api/generate-ads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: 'test-job-' + Date.now(),
        productUrl: 'https://example.com/product'
      })
    });
    
    if (!adGenResponse.ok) {
      console.log('❌ Ad generation API failed:', adGenResponse.status);
      const errorText = await adGenResponse.text();
      console.log('Error details:', errorText);
    } else {
      const adGenResult = await adGenResponse.json();
      console.log('✅ Ad generation API response:', adGenResult);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testHomepageAPI().catch(console.error);
