import { EventEmitter } from "events";

export type RealtimeEventType =
  | "CONNECTED"
  | "BRANDING_UPDATED"
  | "DUEL_UPDATE"
  | "TRACK_CHANGE"
  | "QUEUE_UPDATE"
  | "QUEUE_POLICY_UPDATED"
  | "QUEUE_SLOT_UNLOCKED"
  | "TABLE_OCCUPANCY_CHANGED"
  | "TABLE_RELEASED"
  | "TABLE_UPDATED"
  | "TABLE_DELETED"
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
  | "NEXT_TURN_COUNTDOWN"
  | "NEXT_TURN_CANCELLED"
  | "KARAOKE_VIDEO_UPDATE"
  | "KARAOKE_PLAYBACK_CONTROL"
  | "PULSE_UPDATE"
  | "CONTEST_STAGE_CHANGE"
  | "CONTEST_PERFORMANCE_UPDATE"
  | "CONTEST_VOTING_OPEN"
  | "CONTEST_VOTING_CLOSED"
  | "CONTEST_VOTE_UPDATE"
  | "CONTEST_REVEAL_SCORES"
  | "CONTEST_GOLDEN_BUZZER"
  | "CONTEST_LEADERBOARD_UPDATE"
  | "CONTEST_PARTICIPANT_REGISTERED"
  | "ACCREDITATION_REGISTERED"
  | "ACCREDITATION_STATUS_CHANGED"
  | "CHECKIN_RECORDED";

export interface ActivePlaybackState {
  action: "PLAY" | "PAUSE" | "SEEK" | "RESET";
  seconds?: number;
  duration?: number;
  trackTitle?: string;
  trackArtist?: string;
  videoId?: string | null;
  deckId?: string | null;
  updatedAt: string;
}

export interface NextTurnCountdownPayload {
  queueEntryId: string;
  songRequestId: string;
  tableId: string;
  tableLabel: string;
  guestName?: string | null;
  songTitle: string;
  artist?: string | null;
  seconds: number;
  startedAt: number;
  expiresAt: number;
  timeoutAction: "SKIP" | "AUTOPLAY";
}

export interface RealtimeMessage<T = any> {
  eventId: string;
  type: RealtimeEventType;
  data: T;
  timestamp: string;
}

type RealtimeListener = (message: RealtimeMessage) => void;

class RealtimeEventBus {
  private emitter: EventEmitter;
  private playbackStore: Map<string, ActivePlaybackState> = new Map();

  constructor() {
    this.emitter = new EventEmitter();
    // Aumentar límite de oyentes para salas con múltiples pantallas y cabinas
    this.emitter.setMaxListeners(500);
  }

  public setPlaybackState(key: string, state: ActivePlaybackState): void {
    if (!key) return;
    if (state.action === "RESET") {
      this.playbackStore.delete(key);
      this.playbackStore.delete(key.toUpperCase());
    } else {
      this.playbackStore.set(key, state);
      this.playbackStore.set(key.toUpperCase(), state);
    }
  }

  public getPlaybackState(key: string): ActivePlaybackState | null {
    if (!key) return null;
    return this.playbackStore.get(key) || this.playbackStore.get(key.toUpperCase()) || null;
  }

  public clearPlaybackState(key: string): void {
    if (!key) return;
    this.playbackStore.delete(key);
    this.playbackStore.delete(key.toUpperCase());
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
   * Método de conveniencia compatible con firma (type, data) o (eventId, type, data)
   */
  public emit<T = any>(
    typeOrEventId: string,
    dataOrType: any,
    maybeData?: any
  ): void {
    if (maybeData !== undefined) {
      this.broadcast(typeOrEventId, dataOrType, maybeData);
    } else {
      const eventId = dataOrType?.eventId || "global";
      this.broadcast(eventId, typeOrEventId as RealtimeEventType, dataOrType);
    }
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

export const eventBus = realtimeBus;

globalThis.__vidjs_realtime_bus__ = realtimeBus;
