/**
 * Flow pacing utility for managing chat message timing
 * Ensures proper rhythm and prevents messages from appearing too quickly
 */

interface PacingConfig {
  minDelay: number; // Minimum delay between messages (ms)
  majorEventDelay: number; // Delay after major SSE events (ms)
  temporaryMessageDelay: number; // Delay for temporary messages (ms)
}

class FlowPacingManager {
  private config: PacingConfig = {
    minDelay: 250, // 250ms minimum as specified
    majorEventDelay: 400, // 300-500ms range as specified
    temporaryMessageDelay: 300
  };

  private lastMessageTime: number = 0;
  private pendingTimeouts: NodeJS.Timeout[] = [];

  /**
   * Schedule a message with proper pacing
   */
  scheduleMessage(
    callback: () => void,
    type: 'normal' | 'major_event' | 'temporary' = 'normal'
  ): Promise<void> {
    return new Promise((resolve) => {
      const now = Date.now();
      const timeSinceLastMessage = now - this.lastMessageTime;
      
      let requiredDelay: number;
      switch (type) {
        case 'major_event':
          requiredDelay = this.config.majorEventDelay;
          break;
        case 'temporary':
          requiredDelay = this.config.temporaryMessageDelay;
          break;
        default:
          requiredDelay = this.config.minDelay;
      }

      const actualDelay = Math.max(0, requiredDelay - timeSinceLastMessage);

      const timeout = setTimeout(() => {
        this.lastMessageTime = Date.now();
        callback();
        resolve();
        
        // Remove from pending timeouts
        const index = this.pendingTimeouts.indexOf(timeout);
        if (index > -1) {
          this.pendingTimeouts.splice(index, 1);
        }
      }, actualDelay);

      this.pendingTimeouts.push(timeout);
    });
  }

  /**
   * Schedule multiple messages with staggered timing
   */
  async scheduleSequence(
    messages: Array<{
      callback: () => void;
      type?: 'normal' | 'major_event' | 'temporary';
      delay?: number; // Additional delay for this specific message
    }>
  ): Promise<void> {
    for (const message of messages) {
      await this.scheduleMessage(message.callback, message.type);
      
      // Add additional delay if specified
      if (message.delay) {
        await new Promise(resolve => setTimeout(resolve, message.delay));
      }
    }
  }

  /**
   * Clear all pending messages
   */
  clearPending(): void {
    this.pendingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.pendingTimeouts = [];
  }

  /**
   * Update pacing configuration
   */
  updateConfig(newConfig: Partial<PacingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset timing (useful when starting a new conversation)
   */
  reset(): void {
    this.lastMessageTime = 0;
    this.clearPending();
  }
}

// Export singleton instance
export const flowPacing = new FlowPacingManager();

// Convenience functions
export const scheduleMessage = (callback: () => void, type?: 'normal' | 'major_event' | 'temporary') => 
  flowPacing.scheduleMessage(callback, type);

export const scheduleSequence = (messages: Parameters<typeof flowPacing.scheduleSequence>[0]) =>
  flowPacing.scheduleSequence(messages);

export const clearPendingMessages = () => flowPacing.clearPending();

export const resetFlowPacing = () => flowPacing.reset();
