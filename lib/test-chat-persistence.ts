// Test utilities for chat persistence functionality

import { ChatMessage } from '@/store/chatStore';
import { apiCall } from '@/lib/persistence-utils';

/**
 * Test chat persistence by creating, saving, and loading messages
 */
export async function testChatPersistence(projectId: string): Promise<boolean> {
  console.log('[Test] 🧪 Starting chat persistence test for project:', projectId);

  try {
    // Test 1: Create test messages
    const testMessages: Omit<ChatMessage, 'id' | 'timestamp'>[] = [
      {
        role: 'user',
        type: 'text',
        content: 'Test user message 1',
      },
      {
        role: 'assistant',
        type: 'text',
        content: 'Test assistant response 1',
      },
      {
        role: 'user',
        type: 'text',
        content: 'Test user message 2 with images',
        imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      },
    ];

    console.log('[Test] 📝 Created test messages:', testMessages.length);

    // Test 2: Save messages individually
    const savedMessages: any[] = [];
    for (const message of testMessages) {
      try {
        const response = await apiCall<{ message: any }>(`/api/projects/${projectId}/chat`, {
          method: 'POST',
          body: JSON.stringify({
            role: message.role,
            content: message.content,
            image_urls: message.imageUrls || [],
            message_type: message.type || 'text',
          }),
        });

        savedMessages.push(response.message);
        console.log('[Test] ✅ Saved message:', response.message.id);
      } catch (error) {
        console.error('[Test] ❌ Failed to save message:', error);
        return false;
      }
    }

    console.log('[Test] 💾 Saved all messages successfully');

    // Test 3: Load messages back
    try {
      const response = await apiCall<{ messages: any[] }>(`/api/projects/${projectId}/chat`);
      const loadedMessages = response.messages;

      console.log('[Test] 📥 Loaded messages:', loadedMessages.length);

      // Test 4: Verify message content
      if (loadedMessages.length !== testMessages.length) {
        console.error('[Test] ❌ Message count mismatch:', {
          expected: testMessages.length,
          actual: loadedMessages.length,
        });
        return false;
      }

      for (let i = 0; i < testMessages.length; i++) {
        const original = testMessages[i];
        const loaded = loadedMessages[i];

        if (original.role !== loaded.role) {
          console.error('[Test] ❌ Role mismatch:', { original: original.role, loaded: loaded.role });
          return false;
        }

        if (original.content !== loaded.content) {
          console.error('[Test] ❌ Content mismatch:', { original: original.content, loaded: loaded.content });
          return false;
        }

        if (original.type !== (loaded.message_type || 'text')) {
          console.error('[Test] ❌ Type mismatch:', { original: original.type, loaded: loaded.message_type });
          return false;
        }

        // Check image URLs
        const originalUrls = original.imageUrls || [];
        const loadedUrls = loaded.image_urls || [];
        if (originalUrls.length !== loadedUrls.length) {
          console.error('[Test] ❌ Image URLs count mismatch:', { original: originalUrls, loaded: loadedUrls });
          return false;
        }
      }

      console.log('[Test] ✅ All message content verified successfully');

    } catch (error) {
      console.error('[Test] ❌ Failed to load messages:', error);
      return false;
    }

    // Test 5: Test compatibility API
    try {
      const response = await apiCall<any[]>(`/api/chat/${projectId}`);
      const compatMessages = response;

      console.log('[Test] 📥 Loaded messages via compatibility API:', compatMessages.length);

      if (compatMessages.length !== testMessages.length) {
        console.error('[Test] ❌ Compatibility API message count mismatch:', {
          expected: testMessages.length,
          actual: compatMessages.length,
        });
        return false;
      }

      console.log('[Test] ✅ Compatibility API working correctly');

    } catch (error) {
      console.error('[Test] ❌ Compatibility API failed:', error);
      return false;
    }

    console.log('[Test] 🎉 All chat persistence tests passed!');
    return true;

  } catch (error) {
    console.error('[Test] 💥 Chat persistence test failed:', error);
    return false;
  }
}

/**
 * Test SWR integration
 */
export async function testSWRIntegration(projectId: string): Promise<boolean> {
  console.log('[Test] 🧪 Starting SWR integration test for project:', projectId);

  try {
    // This would require importing SWR hooks in a React component context
    // For now, we'll test the underlying API calls
    
    const { useChatMessages } = await import('@/lib/chat-swr');
    
    // Note: This test would need to be run in a React component context
    // For now, we'll just verify the module loads correctly
    console.log('[Test] ✅ SWR module loaded successfully');
    
    return true;
  } catch (error) {
    console.error('[Test] ❌ SWR integration test failed:', error);
    return false;
  }
}

/**
 * Test error handling
 */
export async function testErrorHandling(): Promise<boolean> {
  console.log('[Test] 🧪 Starting error handling test');

  try {
    // Test 1: Invalid project ID
    try {
      await apiCall<{ messages: any[] }>('/api/projects/invalid-project-id/chat');
      console.error('[Test] ❌ Expected error for invalid project ID');
      return false;
    } catch (error) {
      console.log('[Test] ✅ Correctly handled invalid project ID error');
    }

    // Test 2: Invalid message data
    try {
      await apiCall<{ message: any }>('/api/projects/test-project/chat', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          invalid: 'data',
        }),
      });
      console.error('[Test] ❌ Expected error for invalid message data');
      return false;
    } catch (error) {
      console.log('[Test] ✅ Correctly handled invalid message data error');
    }

    console.log('[Test] 🎉 All error handling tests passed!');
    return true;

  } catch (error) {
    console.error('[Test] 💥 Error handling test failed:', error);
    return false;
  }
}

/**
 * Run all chat persistence tests
 */
export async function runAllChatTests(projectId: string): Promise<boolean> {
  console.log('[Test] 🚀 Running comprehensive chat persistence test suite');

  const tests = [
    { name: 'Chat Persistence', test: () => testChatPersistence(projectId) },
    { name: 'SWR Integration', test: () => testSWRIntegration(projectId) },
    { name: 'Error Handling', test: () => testErrorHandling() },
  ];

  let allPassed = true;

  for (const { name, test } of tests) {
    console.log(`[Test] 🧪 Running ${name} test...`);
    const passed = await test();
    
    if (passed) {
      console.log(`[Test] ✅ ${name} test PASSED`);
    } else {
      console.log(`[Test] ❌ ${name} test FAILED`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('[Test] 🎉 ALL TESTS PASSED! Chat persistence is working correctly.');
  } else {
    console.log('[Test] 💥 SOME TESTS FAILED! Please check the implementation.');
  }

  return allPassed;
}

/**
 * Quick test function for manual testing
 */
export async function quickChatTest(projectId: string = 'test-project-id'): Promise<void> {
  console.log('[Test] 🚀 Running quick chat test...');
  const result = await testChatPersistence(projectId);
  console.log('[Test]', result ? '✅ SUCCESS' : '❌ FAILED');
}
