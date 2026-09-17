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

    // Registrar listeners para cada tipo de evento
    const eventTypes: RealtimeEventType[] = [
      "CONNECTED",
      "DUEL_UPDATE",
      "TRACK_CHANGE",
      "QUEUE_UPDATE",
      "REQUEST_NEW",
      "PHOTO_NEW",
      "PHOTO_APPROVED",
      "PHOTO_REJECTED",
      "PULSE_UPDATE",
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

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

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
