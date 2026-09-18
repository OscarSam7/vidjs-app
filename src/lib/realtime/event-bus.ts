import { EventEmitter } from "events";

export type RealtimeEventType =
  | "CONNECTED"
  | "DUEL_UPDATE"
  | "TRACK_CHANGE"
  | "QUEUE_UPDATE"
  | "QUEUE_POLICY_UPDATED"
  | "QUEUE_SLOT_UNLOCKED"
  | "TABLE_RELEASED"
  | "REQUEST_NEW"
  | "PHOTO_NEW"
  | "PHOTO_APPROVED"
  | "PHOTO_REJECTED"
  | "PHOTO_REMOVED"
  | "PHOTO_FEATURED"
  | "PHOTO_FIT_MODE"
  | "REACTION_BURST"
  | "APPLAUSE_START"
  | "APPLAUSE_TICK"
  | "APPLAUSE_END"
  | "ROULETTE_SPIN"
  | "ROULETTE_RESULT"
  | "SINGER_CALLED"
  | "KARAOKE_VIDEO_UPDATE"
  | "PULSE_UPDATE";

export interface RealtimeMessage<T = any> {
  eventId: string;
  type: RealtimeEventType;
  data: T;
  timestamp: string;
}

type RealtimeListener = (message: RealtimeMessage) => void;

class RealtimeEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    // Aumentar límite de oyentes para salas con múltiples pantallas y cabinas
    this.emitter.setMaxListeners(500);
  }

  private channelName(eventId: string): string {
    return `event:${eventId}`;
  }

  /**
   * Emite un evento en tiempo real para todos los clientes suscritos a este eventId
   */
  public broadcast<T = any>(
    eventId: string,
    type: RealtimeEventType,
    data: T
  ): void {
    const message: RealtimeMessage<T> = {
      eventId,
      type,
      data,
      timestamp: new Date().toISOString(),
    };

    // Emitir al canal del evento específico
    this.emitter.emit(this.channelName(eventId), message);
    // Emitir también a un canal comodín si es necesario
    this.emitter.emit("event:*", message);
  }

  /**
   * Suscribe un callback a los eventos de un eventId particular
   */
  public subscribe(eventId: string, listener: RealtimeListener): void {
    this.emitter.on(this.channelName(eventId), listener);
  }

  /**
   * Cancela la suscripción de un callback
   */
  public unsubscribe(eventId: string, listener: RealtimeListener): void {
    this.emitter.off(this.channelName(eventId), listener);
  }

  /**
   * Retorna el número de oyentes activos en un evento o en total
   */
  public getListenerCount(eventId?: string): number {
    if (eventId) {
      return this.emitter.listenerCount(this.channelName(eventId));
    }
    return this.emitter.eventNames().reduce((total, name) => {
      return total + this.emitter.listenerCount(name);
    }, 0);
  }
}

// Preservar la instancia única en globalThis para evitar duplicados en recargas de Next.js
declare global {
  // eslint-disable-next-line no-var
  var __vidjs_realtime_bus__: RealtimeEventBus | undefined;
}

export const realtimeBus: RealtimeEventBus =
  globalThis.__vidjs_realtime_bus__ ?? new RealtimeEventBus();

globalThis.__vidjs_realtime_bus__ = realtimeBus;
