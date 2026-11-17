"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface UseBeeperRealtimeOptions {
  qrToken?: string | null;
  tenantId?: string | null;
  enabled?: boolean;
  onEvent?: (eventType: string, data: any) => void;
}

export function useBeeperRealtime({
  qrToken,
  tenantId,
  enabled = true,
  onEvent,
}: UseBeeperRealtimeOptions) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!enabled || (!qrToken && !tenantId)) {
      setIsConnected(false);
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const params = new URLSearchParams();
    if (qrToken) params.set("qrToken", qrToken);
    if (tenantId) params.set("tenantId", tenantId);

    const url = `/api/v1/beeper/stream?${params.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    const eventTypes = [
      "CONNECTED",
      "BEEPER_TICKET_CREATED",
      "BEEPER_TICKET_READY",
      "BEEPER_TICKET_RING_AGAIN",
      "BEEPER_TICKET_ACKNOWLEDGED",
      "BEEPER_TICKET_DELIVERED",
      "BEEPER_TICKET_EXPIRED",
      "BEEPER_CONFIG_UPDATED",
    ];

    eventTypes.forEach((type) => {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setLastEvent({ type, data });
          if (type === "CONNECTED") {
            setIsConnected(true);
          }
          if (onEventRef.current) {
            onEventRef.current(type, data);
          }
        } catch (err) {
          console.warn("Error parseando evento beeper SSE:", err);
        }
      });
    });
  }, [qrToken, tenantId, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastEvent,
    reconnect: connect,
  };
}
