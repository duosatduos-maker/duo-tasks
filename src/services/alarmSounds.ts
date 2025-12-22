// Alarm Sound Service using Web Audio API
// Generates different alarm tones without requiring external audio files

class AlarmSoundService {
  private audioContext: AudioContext | null = null;
  private currentOscillators: OscillatorNode[] = [];
  private currentGains: GainNode[] = [];
  private isPlaying = false;

  private getContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  // Gentle: Soft rising tones (like a morning chime)
  playGentle(duration = 3000): void {
    this.stop();
    const ctx = this.getContext();
    this.isPlaying = true;

    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5 + (i * 0.2));
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (duration / 1000));
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + (i * 0.15));
      osc.stop(ctx.currentTime + (duration / 1000));
      
      this.currentOscillators.push(osc);
      this.currentGains.push(gain);
    });

    setTimeout(() => {
      this.isPlaying = false;
    }, duration);
  }

  // Energetic: Fast pulsing beeps
  playEnergetic(duration = 3000): void {
    this.stop();
    const ctx = this.getContext();
    this.isPlaying = true;

    const beepDuration = 0.1;
    const beepInterval = 0.15;
    const numBeeps = Math.floor(duration / 1000 / beepInterval);

    for (let i = 0; i < numBeeps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(880 + (i % 2) * 220, ctx.currentTime); // A5/B5 alternating
      
      const startTime = ctx.currentTime + (i * beepInterval);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + beepDuration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + beepDuration + 0.01);
      
      this.currentOscillators.push(osc);
      this.currentGains.push(gain);
    }

    setTimeout(() => {
      this.isPlaying = false;
    }, duration);
  }

  // Classic: Traditional alarm bell pattern
  playClassic(duration = 3000): void {
    this.stop();
    const ctx = this.getContext();
    this.isPlaying = true;

    const ringDuration = 0.08;
    const ringInterval = 0.12;
    const numRings = Math.floor(duration / 1000 / ringInterval);

    for (let i = 0; i < numRings; i++) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(1200, ctx.currentTime);
      osc2.frequency.setValueAtTime(1400, ctx.currentTime);
      
      const startTime = ctx.currentTime + (i * ringInterval);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + ringDuration);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + ringDuration + 0.01);
      osc2.stop(startTime + ringDuration + 0.01);
      
      this.currentOscillators.push(osc1, osc2);
      this.currentGains.push(gain);
    }

    setTimeout(() => {
      this.isPlaying = false;
    }, duration);
  }

  // Nature: Bird-like chirping sounds
  playNature(duration = 3000): void {
    this.stop();
    const ctx = this.getContext();
    this.isPlaying = true;

    const chirpCount = 6;
    const chirpInterval = duration / 1000 / chirpCount;

    for (let i = 0; i < chirpCount; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      
      const startTime = ctx.currentTime + (i * chirpInterval);
      const baseFreq = 2000 + Math.random() * 500;
      
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, startTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, startTime + 0.2);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.35);
      
      this.currentOscillators.push(osc);
      this.currentGains.push(gain);
    }

    setTimeout(() => {
      this.isPlaying = false;
    }, duration);
  }

  // Play sound by key
  play(soundKey: string, duration = 3000): void {
    switch (soundKey) {
      case 'gentle':
        this.playGentle(duration);
        break;
      case 'energetic':
        this.playEnergetic(duration);
        break;
      case 'classic':
        this.playClassic(duration);
        break;
      case 'nature':
        this.playNature(duration);
        break;
      default:
        this.playClassic(duration);
    }
  }

  // Preview sound (shorter duration)
  preview(soundKey: string): void {
    this.play(soundKey, 1500);
  }

  // Stop all sounds
  stop(): void {
    this.currentOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Already stopped
      }
    });
    this.currentGains.forEach(gain => {
      try {
        gain.disconnect();
      } catch (e) {
        // Already disconnected
      }
    });
    this.currentOscillators = [];
    this.currentGains = [];
    this.isPlaying = false;
  }

  // Check if currently playing
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const alarmSoundService = new AlarmSoundService();
