const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testCreateProjectFromPrompt() {
  console.log('🧪 Testing createProjectFromPrompt function...');
  
  try {
    // Test the exact API call that createProjectFromPrompt makes
    const testUrl = 'https://thewholetruthfoods.com/products/badaam-chocolates?sku_id=38763083';
    
    // Extract project name from prompt (first 3 words) - like the function does
    const words = testUrl.trim().split(/\s+/);
    const projectName = words.slice(0, 3).join(' ') || 'Untitled Project';
    
    console.log('📍 Step 1: Extracted project name:', projectName);
    console.log('📍 Step 2: Making API call...');
    
    const response = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        description: testUrl,
        thumbnail_url: '',
      }),
    });
    
    console.log('📍 Step 3: API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API error:', errorText);
      throw new Error(`API call failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ API response:', result);
    console.log('✅ Project ID:', result.project_id);
    
    if (result.project_id) {
      console.log('✅ createProjectFromPrompt would return:', result.project_id);
      
      // Test navigation URL
      const playgroundUrl = `${BASE_URL}/playground/${result.project_id}`;
      console.log('✅ Would navigate to:', playgroundUrl);
    } else {
      console.log('❌ No project_id in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCreateProjectFromPrompt().catch(console.error);
