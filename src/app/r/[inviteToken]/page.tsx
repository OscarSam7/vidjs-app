"use client";

import React, { useState, useEffect, use } from "react";
import {
  Sparkles,
  Ticket,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  PartyPopper,
  Tv,
  Gift,
  ArrowRight,
  Loader2,
  QrCode,
  Download,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import QRCode from "qrcode";

interface InviteData {
  id: string;
  customerName: string;
  birthdayPersonName?: string | null;
  birthdayPhotoUrl?: string | null;
  reservationDate: string;
  venue: { id: string; name: string; whatsappNumber?: string | null };
  table: { number: number; label: string; zone: string };
  package?: { name: string; colorHex: string; isBirthdayPackage: boolean } | null;
  decoration?: { name: string; imageUrl: string } | null;
  maxGuests: number;
  claimedCount: number;
  remainingCount: number;
  guests: Array<{ id: string; guestName: string; checkedIn: boolean }>;
}

export default function GuestInvitePage({
  params,
}: {
  params: Promise<{ inviteToken: string }>;
}) {
  const { inviteToken } = use(params);

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<InviteData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestDoc, setGuestDoc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generated Pass
  const [claimedPass, setClaimedPass] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const loadInvite = async () => {
    try {
      const res = await fetch(`/api/v1/reservations/invite/${inviteToken}`);
      const json = await res.json();
      if (json.success) {
        setData(json.reservation);
      } else {
        setErrorMsg(json.error?.message || "Invitación no encontrada");
      }
    } catch (err: any) {
      setErrorMsg("Error de conexión al cargar la invitación");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvite();
  }, [inviteToken]);

  const handleClaimPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim()) {
      alert("Por favor completa tu Nombre y WhatsApp");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/reservations/invite/${inviteToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestDoc: guestDoc.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.guest) {
        setClaimedPass(json.guest);
        // Generate QR code data url
        const qr = await QRCode.toDataURL(json.guest.qrToken, {
          width: 320,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        setQrDataUrl(qr);
      } else {
        alert(json.error?.message || "No se pudo generar el pase");
      }
    } catch (err: any) {
      alert("Error al procesar el pase: " + (err.message || ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060D17] text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className="text-sm text-slate-400">Cargando invitación VIP...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-[#060D17] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0F1E36] border border-[#263858] p-6 rounded-2xl text-center space-y-4">
          <Ticket className="w-12 h-12 text-pink-500 mx-auto opacity-60" />
          <h1 className="text-lg font-bold text-white">Invitación No Disponible</h1>
          <p className="text-xs text-slate-400">{errorMsg || "Este enlace no es válido o ha expirado."}</p>
        </div>
      </div>
    );
  }

  // PASS CLAIMED SCREEN (INDIVIDUAL DIGITAL QR PASS)
  if (claimedPass && qrDataUrl) {
    return (
      <div className="min-h-screen bg-[#060D17] text-white flex flex-col items-center justify-center p-4 py-8">
        <div className="max-w-sm w-full bg-[#0F1E36] border border-purple-500/50 rounded-3xl overflow-hidden shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-purple-800 p-4 text-white">
            <span className="text-[10px] font-black tracking-widest uppercase block opacity-80">
              {data.venue.name} &bull; PASE VIP SIN FILA
            </span>
            <h1 className="text-lg font-black mt-0.5">Acceso a Mesa VIP #{data.table.number}</h1>
          </div>

          <div className="p-5 pt-0 space-y-4">
            <div className="bg-white p-3.5 rounded-2xl inline-block shadow-lg mx-auto">
              <img src={qrDataUrl} alt="Pase QR VIP" className="w-56 h-56 mx-auto" />
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Invitado/a</span>
              <span className="text-base font-black text-white">{claimedPass.guestName}</span>
              <span className="text-xs text-purple-300 block font-mono">{claimedPass.guestPhone}</span>
            </div>

            <div className="bg-[#0A1322] border border-[#263858] p-3 rounded-xl text-left space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Anfitrión:</span>
                <span className="font-bold text-white">{data.birthdayPersonName || data.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha:</span>
                <span className="font-bold text-slate-200">
                  {new Date(data.reservationDate).toLocaleDateString("es-PY", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mesa:</span>
                <span className="font-bold text-pink-300">
                  Mesa #{data.table.number} ({data.table.label})
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Muestra este código QR en la entrada del local para ingresar directo sin hacer fila.
            </p>

            <a
              href={qrDataUrl}
              download={`pase-vip-${claimedPass.guestName.replace(/\s+/g, "-")}.png`}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs p-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Pase QR a mi Teléfono</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // PASS CLAIM FORM
  return (
    <div className="min-h-screen bg-[#060D17] text-white flex flex-col items-center justify-center p-4 py-8">
      <div className="max-w-md w-full bg-[#0F1E36] border border-[#263858] rounded-3xl overflow-hidden shadow-2xl space-y-5 animate-in fade-in duration-300">
        {/* Banner with Celebrant / Host Info */}
        <div className="relative bg-gradient-to-br from-purple-900 via-pink-900/60 to-[#0A1322] p-6 text-center border-b border-[#263858]">
          <span className="text-[10px] font-black uppercase tracking-widest text-pink-300 block">
            {data.venue.name} &bull; INVITACIÓN VIP
          </span>

          <h1 className="text-2xl font-black text-white mt-1">
            {data.birthdayPersonName
              ? `¡Cumpleaños de ${data.birthdayPersonName}!`
              : `Mesa VIP de ${data.customerName}`}
          </h1>

          <p className="text-xs text-slate-300 mt-1">
            Has sido invitado/a a compartir esta noche exclusiva en Mesa #{data.table.number}.
          </p>

          {data.birthdayPhotoUrl && (
            <div className="mt-3 relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-pink-400 shadow-lg">
              <img
                src={data.birthdayPhotoUrl}
                alt="Cumpleañero/a"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Spots Remaining Pill */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-pink-500/40 text-[11px] font-bold text-pink-300">
            <Users className="w-3.5 h-3.5" />
            <span>
              {data.remainingCount > 0
                ? `Quedan ${data.remainingCount} de ${data.maxGuests} pases disponibles`
                : "Cupo completo de invitados"}
            </span>
          </div>
        </div>

        {/* Decoration Theme Card Preview (if chosen) */}
        {data.decoration && (
          <div className="mx-6 p-3 bg-[#0A1322] border border-[#263858] rounded-2xl flex items-center gap-3">
            <img
              src={data.decoration.imageUrl}
              alt={data.decoration.name}
              className="w-14 h-12 object-cover rounded-xl border border-pink-600/40"
            />
            <div className="text-left flex-1 truncate">
              <span className="text-[10px] font-bold text-pink-400 block uppercase">Ambientación de la Mesa</span>
              <span className="text-xs font-bold text-white block truncate">{data.decoration.name}</span>
            </div>
          </div>
        )}

        {/* Claim Form */}
        <div className="p-6 pt-0 space-y-4">
          {data.remainingCount > 0 ? (
            <form onSubmit={handleClaimPass} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tu Nombre y Apellido <span className="text-pink-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Ej: Marcos Alvarenga"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  className="bg-[#0A1322] border-[#263858] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Tu WhatsApp <span className="text-pink-400">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="Ej: 0981 999 888"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                  className="bg-[#0A1322] border-[#263858] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Cédula / Documento (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Para agilizar tu control de puerta"
                  value={guestDoc}
                  onChange={(e) => setGuestDoc(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-sm p-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-600/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando tu Pase VIP...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Obtener mi Pase VIP de Acceso</span>
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl text-center text-xs text-amber-200">
              Se han agotado los pases VIP asignados para esta mesa. Consulta con el anfitrión.
            </div>
          )}

          {/* Confirmed Guests List */}
          {data.guests.length > 0 && (
            <div className="pt-3 border-t border-[#263858] text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                Amigos ya confirmados ({data.guests.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {data.guests.map((g) => (
                  <span
                    key={g.id}
                    className="bg-[#0A1322] border border-[#263858] text-[11px] text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{g.guestName}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
