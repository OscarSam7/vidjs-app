"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AccreditationEventSummary {
  id: string;
  name: string;
  code: string;
  eventType: string | null;
  status: string;
  startsAt: string;
  endsAt: string | null;
  locationName: string | null;
  organizerName: string | null;
  maxCapacity: number | null;
  daysCount: number | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  _count: {
    participants: number;
    accreditations: number;
    accessPoints: number;
    checkInRecords: number;
    accreditationTypes: number;
  };
  metrics?: {
    totalParticipants: number;
    totalAccredited: number;
    totalCheckedIn: number;
    totalPending: number;
    attendanceRate: number;
  };
}

interface AccreditationContextType {
  events: AccreditationEventSummary[];
  activeEvent: AccreditationEventSummary | null;
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
  isLoading: boolean;
  isOnline: boolean;
  refreshEvents: () => Promise<void>;
  createEventModalOpen: boolean;
  setCreateEventModalOpen: (open: boolean) => void;
}

const AccreditationContext = createContext<AccreditationContextType | undefined>(undefined);

const STORAGE_KEY = "vidjs_active_accreditation_event_id";

export function AccreditationProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<AccreditationEventSummary[]>([]);
  const [activeEventId, setActiveEventIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [createEventModalOpen, setCreateEventModalOpen] = useState<boolean>(false);

  // Monitor online status for offline-ready features
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/accreditation/events");
      if (!res.ok) throw new Error("Error al cargar eventos");
      const data = await res.json();
      const list: AccreditationEventSummary[] = data.events || [];
      setEvents(list);

      // Auto-select event if none active or current one no longer exists
      const savedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (savedId && list.some((e) => e.id === savedId)) {
        setActiveEventIdState(savedId);
      } else if (list.length > 0) {
        // Default to the first active/published event, or simply the first event
        const defaultEvt = list.find((e) => e.status === "ACTIVE" || e.status === "PUBLISHED") || list[0];
        setActiveEventIdState(defaultEvt.id);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, defaultEvt.id);
        }
      } else {
        setActiveEventIdState(null);
      }
    } catch (err) {
      console.error("Failed to load accreditation events:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const setActiveEventId = (id: string | null) => {
    setActiveEventIdState(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const activeEvent = events.find((e) => e.id === activeEventId) || null;

  return (
    <AccreditationContext.Provider
      value={{
        events,
        activeEvent,
        activeEventId,
        setActiveEventId,
        isLoading,
        isOnline,
        refreshEvents,
        createEventModalOpen,
        setCreateEventModalOpen,
      }}
    >
      {children}
    </AccreditationContext.Provider>
  );
}

export function useAccreditation() {
  const context = useContext(AccreditationContext);
  if (!context) {
    throw new Error("useAccreditation must be used within an AccreditationProvider");
  }
  return context;
}
