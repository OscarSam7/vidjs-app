"use client";

let audioCtx: AudioContext | null = null;
let loopInterval: NodeJS.Timeout | null = null;
let wakeLockSentinel: any = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Reproducir sonido de llamada sintetizado con Web Audio API (Cero archivos externos)
 */
export function playBeeperSound(soundType: "CHIME" | "BELL" | "DIGITAL" | "VIBRANT" = "CHIME") {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (soundType === "CHIME") {
      // Clásico timbre armónico de restaurante / sala VIP (Dos tonos cálidos)
      [
        { freq: 587.33, start: 0, dur: 0.8 }, // D5
        { freq: 880.0, start: 0.18, dur: 1.2 }, // A5
      ].forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.35, now + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    } else if (soundType === "BELL") {
      // Campana de servicio metálica
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(987.77, now); // B5
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.5);
    } else if (soundType === "DIGITAL") {
      // Beep-Beep-Beep electrónico de beeper clásico
      [0, 0.15, 0.3].forEach((start) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(1480, now + start);
        gain.gain.setValueAtTime(0.2, now + start);
        gain.gain.setValueAtTime(0.001, now + start + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + 0.08);
      });
    } else {
      // VIBRANT: acorde mayor ascendente brillante
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = idx * 0.1;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.3, now + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + 0.9);
      });
    }
  } catch (err) {
    console.warn("Web Audio no pudo inicializarse:", err);
  }
}

/**
 * Activar vibración en bucle en dispositivos móviles
 */
export function triggerBeeperVibrate() {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 800]);
    }
  } catch {}
}

/**
 * Iniciar timbre y vibración continua mientras el pedido esté ¡LISTO!
 */
export function startBeeperAlertLoop(soundType: "CHIME" | "BELL" | "DIGITAL" | "VIBRANT" = "CHIME") {
  stopBeeperAlertLoop();
  playBeeperSound(soundType);
  triggerBeeperVibrate();

  loopInterval = setInterval(() => {
    playBeeperSound(soundType);
    triggerBeeperVibrate();
  }, 2800);
}

/**
 * Detener el timbre y vibración continua
 */
export function stopBeeperAlertLoop() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(0);
    }
  } catch {}
}

/**
 * Screen Wake Lock API: Evita que el celular apague la pantalla mientras espera el pedido
 */
export async function enableScreenWakeLock() {
  try {
    if (typeof window !== "undefined" && "wakeLock" in navigator) {
      wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockSentinel.addEventListener("release", () => {
        wakeLockSentinel = null;
      });
      return true;
    }
  } catch (e) {
    console.warn("Wake Lock no soportado o bloqueado:", e);
  }
  return false;
}

export function releaseScreenWakeLock() {
  try {
    if (wakeLockSentinel) {
      wakeLockSentinel.release();
      wakeLockSentinel = null;
    }
  } catch {}
}
