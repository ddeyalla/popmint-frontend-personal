import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Home from '../page';
import ClientSidePlayground from '../playground/[sessionId]/client';
import { act } from 'react-dom/test-utils';

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAllItems: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for image generation
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({
    success: true,
    imageUrl: 'https://example.com/generated-image.png'
  }),
  body: {
    getReader: () => ({
      read: jest.fn().mockImplementation(() => {
        // Return a promise that simulates SSE data followed by done
        return Promise.resolve({
          done: false,
          value: new TextEncoder().encode(
            'data: {"type":"agentProgress","content":"Processing..."}\n\n' +
            'data: {"type":"agentOutput","content":"Generated image:","imageUrls":["https://example.com/image.png"]}\n\n'
          ),
        }).then(() => Promise.resolve({ done: true }));
      }),
      cancel: jest.fn(),
    }),
  },
}));

describe('Image Generation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Setup router mock
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
  });

  test('Test Case 1: User enters image generation prompt on homepage and submits', async () => {
    render(<Home />);
    
    // Find the content editable div
    const inputArea = screen.getByRole('textbox');
    
    // Enter text
    act(() => {
      // Simulate input in the contentEditable div
      fireEvent.input(inputArea, {
        target: { textContent: 'generate image of a cat' },
      });
    });
    
    // Click submit
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    // Verify router was called
    await waitFor(() => {
      const router = useRouter();
      expect(router.push).toHaveBeenCalled();
    });
    
    // Verify localStorage was set correctly
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'popmint-should-generate-image',
      'true'
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'popmint-prompt-to-process',
      'generate image of a cat'
    );
    
    // Simulate the user visiting the playground
    const sessionId = 'test-session';
    render(<ClientSidePlayground sessionId={sessionId} />);
    
    // Verify initial message is displayed
    await waitFor(() => {
      expect(screen.getByText('generate image of a cat')).toBeInTheDocument();
    });
    
    // Verify progress message is displayed
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
    
    // Verify final output message is displayed
    await waitFor(() => {
      expect(screen.getByText('Generated image:')).toBeInTheDocument();
    });
  });

  test('Test Case 2: User enters regular text (no image generation) and submits', async () => {
    render(<Home />);
    
    // Find the input
    const inputArea = screen.getByRole('textbox');
    
    // Enter text
    act(() => {
      fireEvent.input(inputArea, {
        target: { textContent: 'Just a regular message' },
      });
    });
    
    // Click submit
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    // Verify localStorage was set correctly
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'popmint-should-generate-image',
      'false'
    );
    
    // Simulate the user visiting the playground
    const sessionId = 'test-session';
    render(<ClientSidePlayground sessionId={sessionId} />);
    
    // Verify initial message is displayed but no image generation happens
    await waitFor(() => {
      expect(screen.getByText('Just a regular message')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  test('Test Case 3: User uploads an image and submits', async () => {
    render(<Home />);
    
    // Mock file upload
    const file = new File(['dummy content'], 'test-image.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/upload image/i);
    
    // Upload file
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Verify the image is displayed
    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
    
    // Click submit with image only (no text)
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    // Verify localStorage includes the image
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      expect.stringContaining('popmint-initial-message'),
      expect.stringContaining('imageUrls')
    );
  });

  test('Test Case 4: Error handling for image generation', async () => {
    // Mock failed fetch
    global.fetch = jest.fn().mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      })
    );
    
    // Render the playground component directly with localStorage set
    localStorageMock.setItem('popmint-should-generate-image', 'true');
    localStorageMock.setItem('popmint-prompt-to-process', 'generate image with error');
    localStorageMock.setItem('popmint-initial-message', JSON.stringify({
      type: 'userInput',
      content: 'generate image with error',
    }));
    
    const sessionId = 'test-session';
    render(<ClientSidePlayground sessionId={sessionId} />);
    
    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
}); 