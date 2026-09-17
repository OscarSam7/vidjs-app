/**
 * Motor de Audio para la Cabina del DJ basado en Web Audio API.
 * Proporciona curvas de crossfader de potencia constante y sintetizadores
 * de efectos de sonido (Airhorn, Scratch, Bass Drop, Aplausos).
 */

export function calculateCrossfaderGains(sliderValue: number) {
  // sliderValue: -100 (Full Deck A) a +100 (Full Deck B)
  const clamped = Math.max(-100, Math.min(100, sliderValue));
  const normalized = (clamped + 100) / 200; // 0.0 (Deck A) a 1.0 (Deck B)

  // Curva de mezcla de Potencia Constante (Equal-Power Curve):
  // Evita la caída de -3dB en el centro común en mezclas lineales.
  const gainA = Math.cos(normalized * (Math.PI / 2));
  const gainB = Math.sin(normalized * (Math.PI / 2));

  return {
    gainA: Math.round(gainA * 1000) / 1000,
    gainB: Math.round(gainB * 1000) / 1000,
    normalized,
  };
}

// Clase de sintetizador de efectos para el navegador
class DjSoundEffectsEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * 📢 Airhorn de Discoteca (Sintetizador de onda de diente de sierra con vibrato)
   */
  public playAirhorn() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 466.16, duration: 0.15 }, // Bb4
      { freq: 466.16, duration: 0.15 },
      { freq: 466.16, duration: 0.15 },
      { freq: 392.0, duration: 0.2 },   // G4
      { freq: 466.16, duration: 0.6 },  // Bb4 sostén
    ];

    let timeOffset = 0;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.freq, now + timeOffset);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, now + timeOffset);
      filter.Q.setValueAtTime(3, now + timeOffset);

      gain.gain.setValueAtTime(0.3, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + timeOffset + n.duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + n.duration);

      timeOffset += n.duration * 0.85;
    });
  }

  /**
   * 🎛️ Vinyl Scratch / Rewind
   */
  public playScratch() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  /**
   * 🔊 Sub Bass Drop (Onda sinusoidal descendente profunda)
   */
  public playBassDrop() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 1.2);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.4);
  }

  /**
   * 👏 Aplausos / Claps de Fiesta (Ráfaga de ruido blanco con envolvente)
   */
  public playClap() {
    const ctx = this.getContext();
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1000;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.35);
  }
}

export const djSoundEffects = new DjSoundEffectsEngine();
