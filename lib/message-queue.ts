/**
 * Message Queue System for Sequential Chat Display
 * Ensures professional, ChatGPT-like message flow with proper timing
 */

import { ChatMessage } from '@/store/chatStore';
import { flowPacing } from './flow-pacing';

export interface QueuedMessage {
  id: string;
  message: ChatMessage;
  priority: 'high' | 'normal' | 'low';
  delay?: number;
  type: 'user' | 'ai' | 'agent' | 'research' | 'concept' | 'output';
}

export interface MessageQueueConfig {
  enableSequencing: boolean;
  baseDelay: number;
  agentDelay: number;
  researchDelay: number;
  conceptDelay: number;
  maxConcurrentMessages: number;
}

class MessageQueueManager {
  private queue: QueuedMessage[] = [];
  private processing = false;
  private config: MessageQueueConfig = {
    enableSequencing: true,
    baseDelay: 250,
    agentDelay: 400,
    researchDelay: 600,
    conceptDelay: 300,
    maxConcurrentMessages: 1
  };

  private currentlyDisplaying = 0;
  private onMessageDisplay?: (message: ChatMessage) => void;

  /**
   * Initialize the message queue with display callback
   */
  initialize(onDisplay: (message: ChatMessage) => void) {
    this.onMessageDisplay = onDisplay;
  }

  /**
   * Add a message to the queue
   */
  enqueue(message: ChatMessage, priority: 'high' | 'normal' | 'low' = 'normal', customDelay?: number): string {
    const queuedMessage: QueuedMessage = {
      id: message.id,
      message,
      priority,
      delay: customDelay,
      type: this.determineMessageType(message)
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(queuedMessage);
    } else {
      this.queue.push(queuedMessage);
    }

    console.log(`[MessageQueue] Enqueued message: ${message.type} (priority: ${priority})`);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return queuedMessage.id;
  }

  /**
   * Process the message queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`[MessageQueue] Starting queue processing with ${this.queue.length} messages`);

    while (this.queue.length > 0 && this.currentlyDisplaying < this.config.maxConcurrentMessages) {
      const queuedMessage = this.queue.shift();
      if (!queuedMessage) break;

      try {
        await this.displayMessage(queuedMessage);
      } catch (error) {
        console.error('[MessageQueue] Error displaying message:', error);
      }
    }

    this.processing = false;
    console.log('[MessageQueue] Queue processing completed');
  }

  /**
   * Display a single message with proper timing
   */
  private async displayMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { message, type, delay } = queuedMessage;
    
    this.currentlyDisplaying++;

    // Calculate delay based on message type
    const calculatedDelay = delay ?? this.getDelayForType(type);

    console.log(`[MessageQueue] Displaying ${type} message with ${calculatedDelay}ms delay`);

    // Use flow pacing for natural timing
    await flowPacing.scheduleMessage(() => {
      if (this.onMessageDisplay) {
        this.onMessageDisplay(message);
      }
    }, this.getFlowPacingType(type));

    // Add additional delay if specified
    if (calculatedDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, calculatedDelay));
    }

    this.currentlyDisplaying--;

    // Continue processing queue if there are more messages
    if (this.queue.length > 0 && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * Determine message type for proper handling
   */
  private determineMessageType(message: ChatMessage): QueuedMessage['type'] {
    switch (message.type) {
      case 'text':
        return message.role === 'user' ? 'user' : 'ai';
      case 'agent_bubble':
        return 'agent';
      case 'agent_output':
        if (message.content.includes('research') || message.content.includes('Research')) {
          return 'research';
        }
        if (message.content.includes('concept') || message.content.includes('Concept')) {
          return 'concept';
        }
        return 'output';
      default:
        return 'ai';
    }
  }

  /**
   * Get delay based on message type
   */
  private getDelayForType(type: QueuedMessage['type']): number {
    switch (type) {
      case 'user':
        return 0; // User messages display immediately
      case 'ai':
        return this.config.baseDelay;
      case 'agent':
        return this.config.agentDelay;
      case 'research':
        return this.config.researchDelay;
      case 'concept':
        return this.config.conceptDelay;
      case 'output':
        return this.config.baseDelay;
      default:
        return this.config.baseDelay;
    }
  }

  /**
   * Get flow pacing type for message
   */
  private getFlowPacingType(type: QueuedMessage['type']): 'normal' | 'major_event' | 'temporary' {
    switch (type) {
      case 'agent':
      case 'research':
        return 'major_event';
      case 'concept':
      case 'output':
        return 'temporary';
      default:
        return 'normal';
    }
  }

  /**
   * Clear the queue (useful for new conversations)
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
    this.currentlyDisplaying = 0;
    flowPacing.clearPending();
    console.log('[MessageQueue] Queue cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MessageQueueConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[MessageQueue] Configuration updated:', this.config);
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      currentlyDisplaying: this.currentlyDisplaying,
      config: this.config
    };
  }

  /**
   * Force process queue (for debugging)
   */
  forceProcess(): void {
    if (!this.processing) {
      this.processQueue();
    }
  }
}

// Export singleton instance
export const messageQueue = new MessageQueueManager();

// Convenience functions
export const enqueueMessage = (message: ChatMessage, priority?: 'high' | 'normal' | 'low', delay?: number) =>
  messageQueue.enqueue(message, priority, delay);

export const clearMessageQueue = () => messageQueue.clear();

export const updateMessageQueueConfig = (config: Partial<MessageQueueConfig>) =>
  messageQueue.updateConfig(config);

export const getMessageQueueStatus = () => messageQueue.getStatus();
