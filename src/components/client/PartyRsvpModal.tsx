"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  UserPlus,
  Users,
  PartyPopper,
  AlertCircle,
  Loader2,
  Phone,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

interface PartyRsvpModalProps {
  venue: {
    id: string;
    name: string;
    slug: string;
    address?: string | null;
    allowCompanions?: boolean;
    partyVisibility?: "PUBLIC" | "PRIVATE";
    rsvpCount?: number;
  } | null;
  onClose: () => void;
  defaultGuestName?: string;
  defaultGuestPhone?: string;
  onConfirmed?: (slug: string, newCount: number) => void;
}

export function PartyRsvpModal({
  venue,
  onClose,
  defaultGuestName = "",
  defaultGuestPhone = "",
  onConfirmed,
}: PartyRsvpModalProps) {
  const [guestName, setGuestName] = useState(defaultGuestName);
  const [guestPhone, setGuestPhone] = useState(defaultGuestPhone);
  const [hasCompanion, setHasCompanion] = useState(false);
  const [companionName, setCompanionName] = useState("");
  const [note, setNote] = useState("");
  const [allowCompanions, setAllowCompanions] = useState<boolean>(venue?.allowCompanions !== false);
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">(venue?.partyVisibility === "PRIVATE" ? "PRIVATE" : "PUBLIC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedData, setConfirmedData] = useState<{
    guestName: string;
    companionName?: string | null;
    totalPeopleCount: number;
    isPrivatePending: boolean;
  } | null>(null);

  useEffect(() => {
    if (!venue) return;
    setGuestName(defaultGuestName);
    setGuestPhone(defaultGuestPhone);
    setHasCompanion(false);
    setCompanionName("");
    setNote("");
    setError(null);
    setConfirmedData(null);
    setAllowCompanions(venue.allowCompanions !== false);
    setVisibility(venue.partyVisibility === "PRIVATE" ? "PRIVATE" : "PUBLIC");

    // Verificar en tiempo real configuración del anfitrión (acompañante + público/privado)
    fetch(`/api/v1/client/party-rsvp?slug=${encodeURIComponent(venue.slug)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (json?.success) {
          if (typeof json.allowCompanions === "boolean") {
            setAllowCompanions(json.allowCompanions);
            if (!json.allowCompanions) {
              setHasCompanion(false);
              setCompanionName("");
            }
          }
          if (json.visibility === "PRIVATE" || json.visibility === "PUBLIC") {
            setVisibility(json.visibility);
          }
        }
      })
      .catch(() => {});
  }, [venue, defaultGuestName, defaultGuestPhone]);

  if (!venue) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (guestName.trim().length < 2) {
      setError("Ingresa tu nombre y apellido.");
      return;
    }
    if (allowCompanions && hasCompanion && companionName.trim().length < 2) {
      setError("Ingresa el nombre de tu acompañante.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/client/party-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: venue.slug,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          hasCompanion: allowCompanions && hasCompanion,
          companionName: allowCompanions && hasCompanion ? companionName.trim() : "",
          note: note.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No se pudo confirmar tu presencia.");
        return;
      }
      setConfirmedData({
        guestName: json.rsvp?.guestName || guestName.trim(),
        companionName: json.rsvp?.companionName || null,
        totalPeopleCount: json.totalPeopleCount || 1,
        isPrivatePending: json.visibility === "PRIVATE" || json.rsvp?.status === "PENDING",
      });
      if (onConfirmed && typeof json.confirmedCount === "number") {
        onConfirmed(venue.slug, json.confirmedCount);
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-zinc-950 border border-pink-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600" />

        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-pink-600 flex items-center justify-center text-white shrink-0 shadow">
              <PartyPopper className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white truncate">{venue.name}</h3>
              <p className="text-[11px] text-zinc-400 truncate">
                {venue.address || "Confirmación de Presencia"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {confirmedData ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-white">
                  {confirmedData.isPrivatePending ? "¡Confirmación Enviada!" : "¡Presencia Confirmada!"}
                </h4>
                <p className="text-xs text-zinc-300">
                  {confirmedData.isPrivatePending ? (
                    <>
                      Gracias, <strong className="text-amber-300">{confirmedData.guestName}</strong>
                      {confirmedData.companionName ? (
                        <>
                          {" "}
                          (con <strong className="text-pink-300">{confirmedData.companionName}</strong>)
                        </>
                      ) : null}
                      . Como es un evento privado, el anfitrión te avisará cuando tu lugar quede reservado.
                    </>
                  ) : (
                    <>
                      Te esperamos, <strong className="text-amber-300">{confirmedData.guestName}</strong>
                      {confirmedData.companionName ? (
                        <>
                          {" "}
                          junto a <strong className="text-pink-300">{confirmedData.companionName}</strong>
                        </>
                      ) : null}
                      .
                    </>
                  )}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-300">
                <Users className="w-3.5 h-3.5 text-pink-400" />
                <span>Ya hay {confirmedData.totalPeopleCount} personas confirmadas</span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-black cursor-pointer"
                >
                  ¡Genial, nos vemos ahí!
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {visibility === "PRIVATE" && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/35 text-[11px] text-amber-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Evento Privado:</strong> deja tu WhatsApp para que el anfitrión te avise cuando tu lugar esté reservado.
                  </span>
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                  Tu Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Ej: Lucas Benítez"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-pink-400" />
                  <span>WhatsApp (Opcional)</span>
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="+595 981 000 000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Opción de Agregar Acompañante (controlada por el anfitrión desde el Panel de Invitación) */}
              {allowCompanions ? (
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-300 flex items-center justify-center shrink-0">
                        <UserPlus className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-white">Agregar acompañante (+1)</div>
                        <div className="text-[10px] text-zinc-400">¿Asistís con alguien más?</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasCompanion}
                      onClick={() => {
                        setHasCompanion((v) => !v);
                        if (hasCompanion) setCompanionName("");
                      }}
                      className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                        hasCompanion ? "bg-pink-600" : "bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          hasCompanion ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {hasCompanion && (
                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-pink-200 mb-1">
                        Nombre de tu acompañante *
                      </label>
                      <input
                        type="text"
                        required
                        value={companionName}
                        onChange={(e) => setCompanionName(e.target.value)}
                        placeholder="Ej: Sofía Martínez"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-pink-500/40 text-xs text-white focus:outline-none focus:border-pink-400"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-3 py-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center gap-2 text-[11px] text-zinc-400">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Invitación personal (en este evento no está habilitado agregar acompañantes).</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-amber-400" />
                  <span>Mensaje / Saludo (Opcional)</span>
                </label>
                <input
                  type="text"
                  maxLength={240}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: ¡Feliz cumple! Ahí estaremos 🎉"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 hover:from-amber-400 hover:via-pink-500 hover:to-purple-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{submitting ? "Confirmando..." : "Confirmo mi Presencia"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
