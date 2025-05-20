import { render } from '@testing-library/react';
import { CanvasArea } from './canvas-area';
import { useCanvasStore } from '@/store/canvasStore';
import { useChatStore } from '@/store/chatStore';
import React from 'react';

jest.mock('@/store/canvasStore');
jest.mock('@/store/chatStore');

describe('CanvasArea', () => {
  let addImage: jest.Mock;
  let objects: any[];
  let setZoomLevel: jest.Mock;
  let setStageOffset: jest.Mock;
  let updateStageOffset: jest.Mock;

  beforeEach(() => {
    addImage = jest.fn();
    setZoomLevel = jest.fn();
    setStageOffset = jest.fn();
    updateStageOffset = jest.fn();
    objects = [];
    (useCanvasStore as unknown as jest.Mock).mockReturnValue({
      objects,
      zoomLevel: 1,
      selectObject: jest.fn(),
      setZoomLevel,
      stageOffset: { x: 0, y: 0 },
      setStageOffset,
      updateStageOffset,
      selectedObjectIds: [],
      deleteObject: jest.fn(),
      selectAllObjects: jest.fn(),
      clearSelection: jest.fn(),
      addImage,
      addText: jest.fn(),
      updateObject: jest.fn(),
      toolMode: 'move',
      duplicateObject: jest.fn(),
      isSidebarCollapsed: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add new images from chat messages with subType image_generated', () => {
    const messages = [
      { type: 'agentOutput', subType: 'image_generated', imageUrls: ['https://test.com/image1.png'] },
    ];
    (useChatStore as unknown as jest.Mock).mockReturnValue({ messages });
    render(<CanvasArea />);
    expect(addImage).toHaveBeenCalledWith('https://test.com/image1.png', 20, 20);
  });

  it('should not add duplicate images already on the canvas', () => {
    objects = [{ src: 'https://test.com/image1.png' }];
    (useCanvasStore as unknown as jest.Mock).mockReturnValue({
      objects,
      zoomLevel: 1,
      selectObject: jest.fn(),
      setZoomLevel,
      stageOffset: { x: 0, y: 0 },
      setStageOffset,
      updateStageOffset,
      selectedObjectIds: [],
      deleteObject: jest.fn(),
      selectAllObjects: jest.fn(),
      clearSelection: jest.fn(),
      addImage,
      addText: jest.fn(),
      updateObject: jest.fn(),
      toolMode: 'move',
      duplicateObject: jest.fn(),
      isSidebarCollapsed: false,
    });
    const messages = [
      { type: 'agentOutput', subType: 'image_generated', imageUrls: ['https://test.com/image1.png'] },
    ];
    (useChatStore as unknown as jest.Mock).mockReturnValue({ messages });
    render(<CanvasArea />);
    expect(addImage).not.toHaveBeenCalled();
  });
}); 