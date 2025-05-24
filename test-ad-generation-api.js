const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testAdGenerationAPI() {
  console.log('🧪 Testing Ad Generation API...');
  
  try {
    // Test the correct API endpoint
    console.log('📍 Step 1: Testing /api/proxy/generate...');
    
    const adGenResponse = await fetch(`${BASE_URL}/api/proxy/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: 'test-job-' + Date.now(),
        product_url: 'https://example.com/product',
        n_images: 4
      })
    });
    
    console.log('📍 Response status:', adGenResponse.status);
    
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
testAdGenerationAPI().catch(console.error);
