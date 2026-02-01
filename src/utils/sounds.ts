
class SoundEngine {
  private ctx: AudioContext | null = null;
  private getContext() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx;
  }
  private playTone(freq: number, type: OscillatorType, duration: number, vol: number) {
    try {
      const c = this.getContext();
      if (c.state === 'suspended') c.resume();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      o.connect(g).connect(c.destination);
      o.start(); o.stop(c.currentTime + duration);
    } catch {}
  }
  playSuccess() { this.playTone(523, 'sine', 0.5, 0.1); setTimeout(() => this.playTone(659, 'sine', 0.5, 0.1), 100); }
  playComplete() { this.playTone(523, 'sine', 0.3, 0.1); setTimeout(() => this.playTone(783, 'sine', 0.3, 0.1), 100); setTimeout(() => this.playTone(1046, 'sine', 0.6, 0.1), 200); }
  playError() { this.playTone(150, 'sawtooth', 0.3, 0.1); setTimeout(() => this.playTone(110, 'sawtooth', 0.5, 0.1), 150); }
  playUpload() { this.playTone(880, 'sine', 0.1, 0.05); }
}
export const soundEngine = new SoundEngine();
