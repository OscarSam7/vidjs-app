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

  /**
   * 🔔 Campana de Escenario (Llamado a Cantantes al escenario)
   */
  public playStageChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chimeNotes = [
      { freq: 659.25, time: 0, duration: 0.8 },    // E5
      { freq: 880.0, time: 0.18, duration: 1.2 },  // A5
      { freq: 1046.5, time: 0.36, duration: 1.5 }, // C6
    ];

    chimeNotes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0.35, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  }

  /**
   * 🥁 Redoble de Tambores y Platillazo (Momento de suspenso / Premiación)
   */
  public playDrumroll() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const rollDuration = 1.3;
    const hitsCount = 24;

    for (let i = 0; i < hitsCount; i++) {
      const hitTime = now + (i / hitsCount) * rollDuration;
      const hitOsc = ctx.createOscillator();
      const hitGain = ctx.createGain();

      hitOsc.type = "triangle";
      hitOsc.frequency.setValueAtTime(120 + Math.random() * 40, hitTime);

      const amp = 0.08 + (i / hitsCount) * 0.22;
      hitGain.gain.setValueAtTime(amp, hitTime);
      hitGain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.06);

      hitOsc.connect(hitGain);
      hitGain.connect(ctx.destination);

      hitOsc.start(hitTime);
      hitOsc.stop(hitTime + 0.06);
    }

    // Platillazo final al terminar el redoble
    const cymbalTime = now + rollDuration;
    const bufferSize = ctx.sampleRate * 0.8;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const cymbalNoise = ctx.createBufferSource();
    cymbalNoise.buffer = buffer;

    const cymbalFilter = ctx.createBiquadFilter();
    cymbalFilter.type = "highpass";
    cymbalFilter.frequency.value = 4500;

    const cymbalGain = ctx.createGain();
    cymbalGain.gain.setValueAtTime(0.4, cymbalTime);
    cymbalGain.gain.exponentialRampToValueAtTime(0.001, cymbalTime + 0.8);

    cymbalNoise.connect(cymbalFilter);
    cymbalFilter.connect(cymbalGain);
    cymbalGain.connect(ctx.destination);

    cymbalNoise.start(cymbalTime);
    cymbalNoise.stop(cymbalTime + 0.8);
  }

  /**
   * 🎺 Trompeta de Pifia / Fail Horn (Comedia cuando alguien desafina)
   */
  public playFailHorn() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 293.66, dur: 0.28 }, // D4
      { freq: 277.18, dur: 0.28 }, // C#4
      { freq: 261.63, dur: 0.28 }, // C4
      { freq: 233.08, dur: 0.7 },  // Bb3 con caída
    ];

    let offset = 0;
    notes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(n.freq, now + offset);

      if (idx === notes.length - 1) {
        // Deslizar tono hacia abajo al final
        osc.frequency.linearRampToValueAtTime(n.freq - 35, now + offset + n.dur);
      }

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(750, now + offset);

      gain.gain.setValueAtTime(0.28, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + n.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + n.dur);

      offset += n.dur * 0.95;
    });
  }

  /**
   * 🎉 Ovación y Vítores del Público (Canto estelar)
   */
  public playOvation() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 2.0;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.linearRampToValueAtTime(1800, now + 1.0);
    filter.frequency.linearRampToValueAtTime(1000, now + 2.0);
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 2.0);
  }

  /**
   * 🔘 Click de CUE / Hot Cue (Feedback percusivo táctil como Pioneer / VirtualDJ)
   */
  public playCueClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  /**
   * ⚡ Tono de Confirmación Beat Sync (Emparejamiento de BPM)
   */
  public playBeatSyncTone() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, delay: 0 },    // C5
      { freq: 659.25, delay: 0.07 }, // E5
      { freq: 783.99, delay: 0.14 }, // G5
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.freq, now + n.delay);

      gain.gain.setValueAtTime(0.18, now + n.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.delay + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.delay);
      osc.stop(now + n.delay + 0.18);
    });
  }

  /**
   * 🛑 Vinyl Brake / Slow Down (Freno de plato giratorio al parar)
   */
  public playVinylBrake() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.85);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.85);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  /**
   * 🎛️ Nudge / Pitch Bend (Micro ajuste de fase para cuadrar compases)
   */
  public playNudge() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  }
}

export const djSoundEffects = new DjSoundEffectsEngine();

