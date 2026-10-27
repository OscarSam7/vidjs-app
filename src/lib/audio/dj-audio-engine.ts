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

export interface DeckChannelNodes {
  audioElement: HTMLMediaElement | null;
  sourceNode: MediaElementAudioSourceNode | null;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHi: BiquadFilterNode;
  channelGain: GainNode;
  crossfaderGain: GainNode;
  analyser: AnalyserNode;
  isBassKillActive: boolean;
  baseEqLow: number;
}

export interface AudioLevels {
  peak: number; // 0.0 a 1.0
  rms: number;  // 0.0 a 1.0
}

class WebDjAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private channels: { A: DeckChannelNodes | null; B: DeckChannelNodes | null } = { A: null, B: null };
  private connectedElements = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private isUnlocked = false;

  public getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx({ sampleRate: 44100 });
      }
    }
    return this.ctx;
  }

  /**
   * Desbloquea el AudioContext ante el primer clic o interacción del usuario
   */
  public async unlock(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // Silencioso si el navegador aún no permite reanudar
      }
    }

    this.ensureMasterBus();
    this.isUnlocked = ctx.state === "running";
    return this.isUnlocked;
  }

  /**
   * Inicializa el bus Master con limitador dinámico y analizador
   */
  private ensureMasterBus() {
    const ctx = this.getContext();
    if (!ctx || this.masterGain) return;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Limitador suave tipo discoteca (evita clipping si ambos decks suenan al 100%)
    this.masterLimiter = ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, ctx.currentTime);
    this.masterLimiter.knee.setValueAtTime(6.0, ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(12.0, ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.003, ctx.currentTime);
    this.masterLimiter.release.setValueAtTime(0.15, ctx.currentTime);

    this.masterAnalyser = ctx.createAnalyser();
    this.masterAnalyser.fftSize = 128;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(ctx.destination);
  }

  /**
   * Configura o retorna la cadena de procesamiento para una bandeja
   */
  public getOrCreateChannel(deckId: "A" | "B"): DeckChannelNodes | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    this.ensureMasterBus();

    if (this.channels[deckId]) {
      return this.channels[deckId];
    }

    // Filtros de ecualización analógicos de 3 bandas
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.setValueAtTime(250, ctx.currentTime);
    eqLow.gain.setValueAtTime(0, ctx.currentTime);

    const eqMid = ctx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.setValueAtTime(1000, ctx.currentTime);
    eqMid.Q.setValueAtTime(1.0, ctx.currentTime);
    eqMid.gain.setValueAtTime(0, ctx.currentTime);

    const eqHi = ctx.createBiquadFilter();
    eqHi.type = "highshelf";
    eqHi.frequency.setValueAtTime(4000, ctx.currentTime);
    eqHi.gain.setValueAtTime(0, ctx.currentTime);

    // Ganancias de canal y crossfader
    const channelGain = ctx.createGain();
    channelGain.gain.setValueAtTime(1.0, ctx.currentTime);

    const crossfaderGain = ctx.createGain();
    const initialGains = calculateCrossfaderGains(0);
    crossfaderGain.gain.setValueAtTime(deckId === "A" ? initialGains.gainA : initialGains.gainB, ctx.currentTime);

    // Analizador de canal para vúmetro LED estéreo
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;

    // Enrutamiento del canal:
    // eqLow -> eqMid -> eqHi -> channelGain -> crossfaderGain -> analyser -> masterGain
    eqLow.connect(eqMid);
    eqMid.connect(eqHi);
    eqHi.connect(channelGain);
    channelGain.connect(crossfaderGain);
    crossfaderGain.connect(analyser);

    if (this.masterGain) {
      crossfaderGain.connect(this.masterGain);
    }

    const channel: DeckChannelNodes = {
      audioElement: null,
      sourceNode: null,
      eqLow,
      eqMid,
      eqHi,
      channelGain,
      crossfaderGain,
      analyser,
      isBassKillActive: false,
      baseEqLow: 0,
    };

    this.channels[deckId] = channel;
    return channel;
  }

  /**
   * Conecta un elemento HTMLMediaElement (audio o video MP4) a la cadena de audio de la bandeja
   */
  public attachAudioElement(deckId: "A" | "B", audioEl: HTMLMediaElement) {
    const ctx = this.getContext();
    if (!ctx) return;
    const channel = this.getOrCreateChannel(deckId);
    if (!channel) return;

    if (channel.audioElement === audioEl && channel.sourceNode) {
      return; // Ya conectado
    }

    channel.audioElement = audioEl;

    let source = this.connectedElements.get(audioEl);
    if (!source) {
      try {
        source = ctx.createMediaElementSource(audioEl);
        this.connectedElements.set(audioEl, source);
      } catch (err) {
        console.warn(`Error attaching audio element to Deck ${deckId}:`, err);
        return;
      }
    }

    channel.sourceNode = source;
    try {
      source.disconnect();
    } catch {
      // Si no estaba conectado
    }
    source.connect(channel.eqLow);
  }

  /**
   * Ajusta el volumen del canal de la bandeja (0 a 100)
   */
  public setChannelVolume(deckId: "A" | "B", vol: number) {
    const channel = this.channels[deckId];
    const ctx = this.getContext();
    if (!channel || !ctx) return;

    const normalized = Math.max(0, Math.min(100, vol)) / 100;
    channel.channelGain.gain.setTargetAtTime(normalized, ctx.currentTime, 0.015);
  }

  /**
   * Ajusta la ecualización analógica de 3 bandas en dB (-24dB a +6dB)
   */
  public setEq(deckId: "A" | "B", low: number, mid: number, hi: number) {
    const channel = this.channels[deckId];
    const ctx = this.getContext();
    if (!channel || !ctx) return;

    channel.baseEqLow = low;

    // Si el Bass Kill está activo, forzamos -40dB en Low
    const effectiveLow = channel.isBassKillActive ? -40 : Math.max(-24, Math.min(6, low));
    const effectiveMid = Math.max(-24, Math.min(6, mid));
    const effectiveHi = Math.max(-24, Math.min(6, hi));

    channel.eqLow.gain.setTargetAtTime(effectiveLow, ctx.currentTime, 0.02);
    channel.eqMid.gain.setTargetAtTime(effectiveMid, ctx.currentTime, 0.02);
    channel.eqHi.gain.setTargetAtTime(effectiveHi, ctx.currentTime, 0.02);
  }

  /**
   * Activa o desactiva el corte instantáneo de bajos (Bass Kill)
   */
  public setBassKill(deckId: "A" | "B", active: boolean) {
    const channel = this.channels[deckId];
    const ctx = this.getContext();
    if (!channel || !ctx) return;

    channel.isBassKillActive = active;
    const targetGain = active ? -45 : channel.baseEqLow;
    channel.eqLow.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.01);
  }

  /**
   * Ajusta la posición del Crossfader (-100 a +100) aplicando potencia constante
   */
  public setCrossfader(sliderValue: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    const gains = calculateCrossfaderGains(sliderValue);

    if (this.channels.A) {
      this.channels.A.crossfaderGain.gain.setTargetAtTime(gains.gainA, ctx.currentTime, 0.015);
    }
    if (this.channels.B) {
      this.channels.B.crossfaderGain.gain.setTargetAtTime(gains.gainB, ctx.currentTime, 0.015);
    }
  }

  /**
   * Ajusta el volumen Master (0 a 100)
   */
  public setMasterVolume(vol: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.ensureMasterBus();
    if (this.masterGain) {
      const normalized = Math.max(0, Math.min(100, vol)) / 100;
      this.masterGain.gain.setTargetAtTime(normalized, ctx.currentTime, 0.015);
    }
  }

  /**
   * Obtiene los niveles de audio en tiempo real para vúmetros LED (Peak & RMS)
   */
  public getLevels(analyser: AnalyserNode | null): AudioLevels {
    if (!analyser) return { peak: 0, rms: 0 };

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buffer);

    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < buffer.length; i++) {
      const norm = (buffer[i] - 128) / 128;
      const abs = Math.abs(norm);
      if (abs > peak) peak = abs;
      sumSquares += norm * norm;
    }

    const rms = Math.sqrt(sumSquares / buffer.length);
    return {
      peak: Math.min(1, peak),
      rms: Math.min(1, rms * 1.6),
    };
  }

  public getChannelLevels(deckId: "A" | "B"): AudioLevels {
    const channel = this.channels[deckId];
    return this.getLevels(channel?.analyser || null);
  }

  public getMasterLevels(): AudioLevels {
    return this.getLevels(this.masterAnalyser);
  }
}

export const webDjEngine = new WebDjAudioEngine();

// Clase de sintetizador de efectos para el navegador
class DjSoundEffectsEngine {
  private getContext(): AudioContext | null {
    return webDjEngine.getContext();
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

  private scrubNodes: {
    osc: OscillatorNode;
    noise: AudioBufferSourceNode;
    gain: GainNode;
    filter: BiquadFilterNode;
  } | null = null;

  private createNoiseBuffer(durationSeconds = 1.0): AudioBuffer | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * durationSeconds));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * 💿 Retroceso de Vinilo Real (Vinyl Nudge Back / Scratch Reverso)
   * Simula la fricción física de la aguja sobre los surcos y caída de tono inercial al retroceder.
   */
  public playVinylNudgeBack(intensity: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = Math.min(0.35, Math.max(0.12, 0.22 * intensity));

    // 1. Textura de fricción de surco de vinilo (Ruido filtrado)
    const noiseBuffer = this.createNoiseBuffer(duration);
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(2600, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(450, now + duration);
      noiseFilter.Q.setValueAtTime(3.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28 * Math.min(1.2, intensity), now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    }

    // 2. Tono musical deformado en reversa (Caída exponencial de frecuencia)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const oscFilter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(980 * Math.min(1.3, intensity), now);
    osc.frequency.exponentialRampToValueAtTime(110, now + duration);

    oscFilter.type = "lowpass";
    oscFilter.frequency.setValueAtTime(1800, now);
    oscFilter.frequency.exponentialRampToValueAtTime(300, now + duration);

    oscGain.gain.setValueAtTime(0.22 * Math.min(1.2, intensity), now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * ⏩ Empuje de Vinilo Hacia Adelante (Vinyl Nudge Forward / Catch-up)
   * Simula empujar el disco con los dedos hacia adelante para acelerar el compás.
   */
  public playVinylNudgeForward(intensity: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = Math.min(0.28, Math.max(0.1, 0.16 * intensity));

    // 1. Textura de fricción de surco
    const noiseBuffer = this.createNoiseBuffer(duration);
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(800, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(2800, now + duration);
      noiseFilter.Q.setValueAtTime(2.8, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22 * Math.min(1.2, intensity), now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    }

    // 2. Subida de tono (acelerón del surco)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(820 * Math.min(1.2, intensity), now + duration);

    oscGain.gain.setValueAtTime(0.2 * Math.min(1.2, intensity), now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * ↺ SPINBACK / BACKSPIN DE DISCOTECA (El auténtico rebobinado salvaje de vinilo)
   * Simula girar violentamente el disco hacia atrás con desaceleración inercial y caída de aguja.
   */
  public playVinylSpinback(duration: number = 1.15) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Ruido blanco envolvente con ráfagas moduladas de giro inverso
    const noiseBuffer = this.createNoiseBuffer(duration);
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(3600, now);
      filter.frequency.exponentialRampToValueAtTime(280, now + duration);
      filter.Q.setValueAtTime(3.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.38, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    }

    // 2. Osciladores multitono con descenso de pitch dramático
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1850, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.75);
    osc.frequency.exponentialRampToValueAtTime(38, now + duration);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1250, now);
    osc2.frequency.exponentialRampToValueAtTime(420, now + 0.35);
    osc2.frequency.exponentialRampToValueAtTime(120, now + 0.75);
    osc2.frequency.exponentialRampToValueAtTime(25, now + duration);

    oscGain.gain.setValueAtTime(0.28, now);
    oscGain.gain.linearRampToValueAtTime(0.32, now + 0.2);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(2800, now);
    lowpass.frequency.exponentialRampToValueAtTime(220, now + duration);

    osc.connect(lowpass);
    osc2.connect(lowpass);
    lowpass.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration);

    // 3. Golpe sutil de caída de aguja al final (needle settle click)
    const settleTime = now + duration * 0.92;
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(140, settleTime);
    clickGain.gain.setValueAtTime(0.18, settleTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, settleTime + 0.05);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(settleTime);
    clickOsc.stop(settleTime + 0.05);
  }

  /**
   * 🎛️ Scratching de Vinilo Dinámico (Scratch táctil con dirección y velocidad)
   */
  public playVinylScratch(direction: -1 | 1, speed: number = 1.0) {
    if (direction === -1) {
      this.playVinylNudgeBack(speed);
    } else {
      this.playVinylNudgeForward(speed);
    }
  }

  /**
   * 🔄 Rebobinado Continuo de Vinilo (Al mantener presionado el Nudge o arrastrar continuo)
   */
  public startContinuousVinylScrub(dir: -1 | 1 = -1) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.stopContinuousVinylScrub();

    const now = ctx.currentTime;
    const noiseBuffer = this.createNoiseBuffer(3.0);
    if (!noiseBuffer) return;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(dir === -1 ? 1600 : 2000, now);
    filter.Q.setValueAtTime(3.0, now);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(dir === -1 ? 480 : 620, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);

    noise.connect(filter);
    filter.connect(gain);
    osc.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);

    this.scrubNodes = { osc, noise, gain, filter };
  }

  public stopContinuousVinylScrub() {
    if (!this.scrubNodes) return;
    const ctx = this.getContext();
    if (ctx) {
      try {
        const now = ctx.currentTime;
        this.scrubNodes.gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        const nodes = this.scrubNodes;
        setTimeout(() => {
          try {
            nodes.noise.stop();
            nodes.osc.stop();
          } catch {}
        }, 50);
      } catch {}
    }
    this.scrubNodes = null;
  }

  /**
   * 🎛️ Vinyl Scratch / Rewind (Compatibilidad clásica)
   */
  public playScratch() {
    this.playVinylSpinback(0.8);
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
   * 🔘 Click de CUE / Hot Cue (Silenciado para evitar pitidos sobre la música)
   */
  public playCueClick() {
    // Silenciado intencionalmente a petición para evitar pitidos táctiles
    return;
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
   * 🎛️ Nudge / Pitch Bend con sonido de vinilo real (sin pitidos electrónicos)
   */
  public playNudge(direction: -1 | 1 = -1, intensity: number = 1.0) {
    if (direction === -1) {
      this.playVinylNudgeBack(intensity);
    } else {
      this.playVinylNudgeForward(intensity);
    }
  }

  /**
   * 🔫 Disparo Láser EDM (Sintetizador de frecuencia descendente ultra rápida con resonancia)
   */
  public playLaser() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + 0.16);
    filter.Q.value = 4.5;

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * 🚨 Sirena Rave / Alarma de Club (Modulación de dos tonos estilo discoteca)
   */
  public playSiren() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.88;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.linearRampToValueAtTime(1080, now + 0.22);
    osc.frequency.linearRampToValueAtTime(680, now + 0.44);
    osc.frequency.linearRampToValueAtTime(1080, now + 0.66);
    osc.frequency.exponentialRampToValueAtTime(280, now + duration);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.linearRampToValueAtTime(0.32, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2200;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * 🚀 Subida Riser / Build-Up de Tensión (Subida de tono y barrido de filtro pre-drop)
   */
  public playRiser(duration = 1.3) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + duration);

    oscGain.gain.setValueAtTime(0.05, now);
    oscGain.gain.linearRampToValueAtTime(0.28, now + duration * 0.85);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const noiseBuffer = this.createNoiseBuffer(duration);
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(3600, now + duration);
      filter.Q.value = 3.5;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, now);
      noiseGain.gain.linearRampToValueAtTime(0.32, now + duration * 0.9);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + duration);
    }

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * 💥 Impacto / Boom Explosivo (Golpe de subgrave profundo + estallido cinemático)
   */
  public playImpact() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.9);

    oscGain.gain.setValueAtTime(0.55, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.1);

    const noiseBuffer = this.createNoiseBuffer(0.4);
    if (noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.4);
    }
  }

  /**
   * 🗣️ Grito de Fiesta / Crowd Hype (Grito colectivo de euforia en pista)
   */
  public playCrowdCheer() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.85;

    const noiseBuffer = this.createNoiseBuffer(duration);
    if (!noiseBuffer) return;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.setValueAtTime(850, now);
    f1.frequency.linearRampToValueAtTime(1200, now + 0.3);
    f1.Q.value = 3.0;

    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.setValueAtTime(2200, now);
    f2.frequency.linearRampToValueAtTime(2800, now + 0.3);
    f2.Q.value = 2.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(f1);
    noise.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * 🎺 Fanfarria de Victoria (4 notas triunfales para festejo en Karaoke)
   */
  public playFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, time: 0, dur: 0.14 },    // C5
      { freq: 659.25, time: 0.14, dur: 0.14 }, // E5
      { freq: 783.99, time: 0.28, dur: 0.16 }, // G5
      { freq: 1046.5, time: 0.44, dur: 0.75 }, // C6 triunfal
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2600, now + time);

      gain.gain.setValueAtTime(0.3, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  }

  /**
   * 🎙️ Test de Micrófono / Ping Estéreo (Doble toque de comprobación)
   */
  public playMicCheck() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0, 0.16].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(1760, now + offset); // A6
      osc.frequency.exponentialRampToValueAtTime(880, now + offset + 0.1);

      gain.gain.setValueAtTime(0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offset);
      osc.stop(now + offset + 0.12);
    });
  }

  /**
   * ⏳ Tensión & Suspenso (Drone pulsante de votación o anuncio)
   */
  public playSuspense() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 1.3;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(55, now);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(58, now);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  /**
   * 🛎️ Gong Resonante / Campana Final (Remate de canción o cierre de turno)
   */
  public playGong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 1.6;

    const partials = [
      { freq: 240, gain: 0.35 },
      { freq: 382, gain: 0.25 },
      { freq: 512, gain: 0.18 },
      { freq: 730, gain: 0.12 },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(p.freq, now);

      g.gain.setValueAtTime(p.gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(g);
      g.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  /**
   * ⏱️ Conteo 3-2-1 para Entrar a Cantar (3 toques de aviso + 1 tono de salida)
   */
  public playCountdown() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const beeps = [
      { time: 0, freq: 880, dur: 0.08, vol: 0.2 },
      { time: 0.35, freq: 880, dur: 0.08, vol: 0.2 },
      { time: 0.70, freq: 880, dur: 0.08, vol: 0.2 },
      { time: 1.05, freq: 1760, dur: 0.35, vol: 0.35 },
    ];

    beeps.forEach((b) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(b.freq, now + b.time);

      gain.gain.setValueAtTime(b.vol, now + b.time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + b.time + b.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + b.time);
      osc.stop(now + b.time + b.dur);
    });
  }
}

export const djSoundEffects = new DjSoundEffectsEngine();

