"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { RealtimeEventType } from "@/lib/realtime/event-bus";

interface UseRealtimeOptions {
  eventId?: string | null;
  code?: string | null;
  enabled?: boolean;
  onEvent?: (type: RealtimeEventType, data: any) => void;
}

interface UseRealtimeReturn {
  isConnected: boolean;
  lastEvent: { type: RealtimeEventType; data: any } | null;
  lastEventTime: Date | null;
  reconnect: () => void;
}

export function useRealtime({
  eventId,
  code,
  enabled = true,
  onEvent,
}: UseRealtimeOptions): UseRealtimeReturn {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<{
    type: RealtimeEventType;
    data: any;
  } | null>(null);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!enabled || (!eventId && !code)) {
      setIsConnected(false);
      return;
    }

    // Cerrar conexión previa si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const params = new URLSearchParams();
    if (eventId) params.set("eventId", eventId);
    if (code) params.set("code", code);

    const url = `/api/v1/realtime?${params.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
      // EventSource reconectará automáticamente de forma nativa
    };

    // Registrar listeners para cada tipo de evento (incluyendo todos los eventos Gastronómicos KDS)
    const eventTypes: RealtimeEventType[] = [
      "CONNECTED",
      "BRANDING_UPDATED",
      "DUEL_UPDATE",
      "TRACK_CHANGE",
      "QUEUE_UPDATE",
      "QUEUE_POLICY_UPDATED",
      "QUEUE_SLOT_UNLOCKED",
      "TABLE_OCCUPANCY_CHANGED",
      "TABLE_RELEASED",
      "TABLE_UPDATED",
      "TABLE_DELETED",
      "REQUEST_NEW",
      "PHOTO_NEW",
      "PHOTO_APPROVED",
      "PHOTO_REJECTED",
      "PHOTO_REMOVED",
      "PHOTO_FEATURED",
      "PHOTO_FIT_MODE",
      "REACTION_BURST",
      "APPLAUSE_START",
      "APPLAUSE_TICK",
      "APPLAUSE_END",
      "ROULETTE_SPIN",
      "ROULETTE_RESULT",
      "SINGER_CALLED",
      "NEXT_TURN_COUNTDOWN",
      "NEXT_TURN_CANCELLED",
      "KARAOKE_VIDEO_UPDATE",
      "KARAOKE_PLAYBACK_CONTROL",
      "PULSE_UPDATE",
      "CONTEST_STAGE_CHANGE",
      "CONTEST_PERFORMANCE_UPDATE",
      "CONTEST_VOTING_OPEN",
      "CONTEST_VOTING_CLOSED",
      "CONTEST_VOTE_UPDATE",
      "CONTEST_REVEAL_SCORES",
      "CONTEST_GOLDEN_BUZZER",
      "CONTEST_LEADERBOARD_UPDATE",
      "CONTEST_PARTICIPANT_REGISTERED",
      "ACCREDITATION_REGISTERED",
      "ACCREDITATION_STATUS_CHANGED",
      "CHECKIN_RECORDED",
      "GASTRO_ORDER_NEW_BAR",
      "GASTRO_ORDER_NEW_KITCHEN",
      "GASTRO_ORDER_UPDATED",
      "GASTRO_PAYMENT_CONFIRMED",
      "GASTRO_PAYMENT_REJECTED",
      "GASTRO_ORDER_PREPARED",
      "GASTRO_WAITER_REQUESTED",
      "GASTRO_ORDER_ACCEPTED_BY_WAITER",
      "GASTRO_ORDER_DELIVERED",
      "GASTRO_PRODUCT_EXHAUSTED",
      "GASTRO_PRODUCT_REACTIVATED",
      "GASTRO_DELIVERY_CONFIG_UPDATED",
      "GASTRO_TABLE_SESSION_UPDATED",
      "GASTRO_INVOICING_UPDATED",
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent({ type, data });
          setLastEventTime(new Date());

          if (type === "CONNECTED") {
            setIsConnected(true);
          }

          if (onEventRef.current) {
            onEventRef.current(type, data);
          }
        } catch (err) {
          console.error(`[Realtime SSE] Error parseando evento ${type}:`, err);
        }
      });
    });
  }, [eventId, code, enabled]);

  useEffect(() => {
    connect();

    // Sincronización silenciosa adicional para pantallas KDS / Gastronomía (eventId === "global")
    // Garantiza actualización instantánea entre pestañas (BroadcastChannel) y respaldo silencioso cada 2.5s
    let bc: BroadcastChannel | null = null;
    let silentInterval: ReturnType<typeof setInterval> | null = null;

    if (typeof window !== "undefined" && enabled && eventId === "global") {
      try {
        bc = new BroadcastChannel("vidjs_gastro_kds_sync");
        bc.onmessage = (ev) => {
          const msgType = (ev.data?.type || "GASTRO_ORDER_UPDATED") as RealtimeEventType;
          if (onEventRef.current) {
            onEventRef.current(msgType, ev.data?.data || {});
          }
        };
      } catch {
        // BroadcastChannel no soportado en navegadores antiguos
      }

      silentInterval = setInterval(() => {
        if (document.visibilityState === "visible" && onEventRef.current) {
          onEventRef.current("GASTRO_ORDER_UPDATED", { silentPoll: true });
        }
      }, 2500);
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && enabled && eventId === "global" && onEventRef.current) {
        onEventRef.current("GASTRO_ORDER_UPDATED", { focusSync: true });
      }
    };

    if (typeof window !== "undefined" && enabled && eventId === "global") {
      window.addEventListener("focus", handleVisibilityOrFocus);
      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (bc) {
        bc.close();
      }
      if (silentInterval) {
        clearInterval(silentInterval);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityOrFocus);
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      }
    };
  }, [connect, enabled, eventId]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  return {
    isConnected,
    lastEvent,
    lastEventTime,
    reconnect,
  };
}
