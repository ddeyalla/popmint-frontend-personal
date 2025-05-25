/**
 * Sound effects utility for chat interactions
 * Provides audio feedback for various chat events
 */

type SFXType = 'message_send' | 'message_receive' | 'agent_complete' | 'error' | 'copy_success';

interface SFXConfig {
  enabled: boolean;
  volume: number;
}

class SFXManager {
  private config: SFXConfig = {
    enabled: true,
    volume: 0.3
  };

  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      document.addEventListener('click', this.initAudioContext.bind(this), { once: true });
    }
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || !this.config.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.config.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  play(type: SFXType) {
    switch (type) {
      case 'message_send':
        this.createTone(800, 0.1, 'sine');
        break;
      case 'message_receive':
        this.createTone(600, 0.15, 'sine');
        break;
      case 'agent_complete':
        // Success chord
        this.createTone(523, 0.2, 'sine'); // C
        setTimeout(() => this.createTone(659, 0.2, 'sine'), 100); // E
        setTimeout(() => this.createTone(784, 0.3, 'sine'), 200); // G
        break;
      case 'error':
        this.createTone(300, 0.3, 'sawtooth');
        break;
      case 'copy_success':
        this.createTone(1000, 0.1, 'sine');
        break;
    }
  }

  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }
}

// Export singleton instance
export const playSFX = new SFXManager();

// Convenience functions
export const playMessageSend = () => playSFX.play('message_send');
export const playMessageReceive = () => playSFX.play('message_receive');
export const playAgentComplete = () => playSFX.play('agent_complete');
export const playError = () => playSFX.play('error');
export const playCopySuccess = () => playSFX.play('copy_success');
