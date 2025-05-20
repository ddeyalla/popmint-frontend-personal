// @jest-environment jsdom
// Jest/RTL test for ChatInput
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInput } from './chat-input';
import { useChatStore } from '@/store/chatStore';
import { useCanvasStore } from '@/store/canvasStore';
import React from 'react';

jest.mock('@/store/chatStore');
jest.mock('@/store/canvasStore');

describe('ChatInput', () => {
  let addMessage: jest.Mock;
  let addImage: jest.Mock;

  beforeEach(() => {
    addMessage = jest.fn();
    addImage = jest.fn();
    (useChatStore as jest.Mock).mockReturnValue(addMessage);
    (useCanvasStore as jest.Mock).mockReturnValue(addImage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add user, progress, and image_generated messages for a successful DALL-E flow', async () => {
    // Mock fetch to return a fake SSE stream
    const mockSSE = async function* () {
      yield new TextEncoder().encode('data: {"type":"agentProgress","content":"Starting..."}\n\n');
      yield new TextEncoder().encode('data: {"type":"agentOutput","content":"Here is your image!","imageUrls":["https://test.com/image.png"]}\n\n');
    };
    // @ts-expect-error: override global.fetch for test
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          const gen = mockSSE();
          return {
            read: () => gen.next(),
          };
        },
      },
    });

    render(<ChatInput />);
    const input = screen.getByPlaceholderText(/prompt/i);
    fireEvent.change(input, { target: { value: 'A test prompt' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      // Should add user message
      expect(addMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'userInput', content: 'A test prompt' }));
      // Should add progress message
      expect(addMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'agentProgress', content: expect.any(String) }));
      // Should add image_generated message
      expect(addMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'agentOutput',
        content: expect.any(String),
        imageUrls: ["https://test.com/image.png"],
        subType: 'image_generated',
      }));
    });
  });

  it('should handle API/network errors gracefully', async () => {
    // @ts-expect-error: override global.fetch for test
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    render(<ChatInput />);
    const input = screen.getByPlaceholderText(/prompt/i);
    fireEvent.change(input, { target: { value: 'fail prompt' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      expect(addMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'agentOutput',
        content: expect.stringMatching(/error/i),
      }));
    });
  });
}); 