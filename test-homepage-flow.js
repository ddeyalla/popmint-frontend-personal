const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

async function testHomepageFlow() {
  console.log('🧪 Testing Homepage → Playground Flow...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('[Playground]') || msg.text().includes('[SSE]') || msg.text().includes('API')) {
        console.log('🖥️  BROWSER:', msg.text());
      }
    });
    
    // Go to homepage
    console.log('📍 Step 1: Navigate to homepage');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    
    // Find the input field and submit button
    console.log('📍 Step 2: Find input field and submit button');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    
    // Type a test URL
    const testUrl = 'https://example.com/product';
    console.log('📍 Step 3: Type test URL:', testUrl);
    await page.type('input[type="text"]', testUrl);
    
    // Click submit
    console.log('📍 Step 4: Click submit button');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to playground
    console.log('📍 Step 5: Wait for navigation to playground');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    // Check if we're in the playground
    const currentUrl = page.url();
    console.log('📍 Step 6: Current URL:', currentUrl);
    
    if (currentUrl.includes('/playground/')) {
      console.log('✅ Successfully navigated to playground!');
      
      // Wait a bit to see if ad generation starts
      console.log('📍 Step 7: Waiting for ad generation to start...');
      await page.waitForTimeout(5000);
      
      console.log('✅ Homepage → Playground flow test completed successfully!');
    } else {
      console.log('❌ Failed to navigate to playground');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testHomepageFlow().catch(console.error);
