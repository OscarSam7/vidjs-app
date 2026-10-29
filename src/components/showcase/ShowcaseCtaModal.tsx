"use client";

import { useState } from "react";
import { X, Sparkles, Send, CheckCircle2, MessageCircle, Phone, Building2, MapPin } from "lucide-react";

interface ShowcaseCtaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShowcaseCtaModal({ isOpen, onClose }: ShowcaseCtaModalProps) {
  const [venueName, setVenueName] = useState("");
  const [contactName, setContactName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [tables, setTables] = useState("20-30 mesas");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleWhatsAppRedirect = () => {
    const text = encodeURIComponent(
      `¡Hola! Estoy muy interesado en implementar Vidjs Pro en mi local:
- Local: ${venueName || "Mi Establecimiento"}
- Contacto: ${contactName || "Gerencia"}
- Ciudad: ${city || "Latinoamérica"}
- Mesas: ${tables}
¿Podríamos coordinar una demostración guiada del sistema y conocer las opciones de suscripción?`
    );
    // Número comercial o enlace directo
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setIsSubmitted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleWhatsAppRedirect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">
              ¡Solicitud Enviada con Éxito!
            </h3>
            <p className="text-sm text-zinc-300 max-w-sm mx-auto">
              Te hemos redirigido a WhatsApp. Un especialista comercial se pondrá en contacto contigo para preparar la demostración personalizada para tu establecimiento.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs cursor-pointer mt-4"
            >
              Cerrar Ventana
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-xs font-mono font-bold text-purple-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>DEMO VIP PERSONALIZADA</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                Lleva Vidjs Pro a tu Local
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Completa estos breves datos para coordinar una prueba en vivo con uno de nuestros asesores de negocio.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nombre del Establecimiento / Club
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Retro Bar Lounge"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Tu Nombre o Rol
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos (Dueño / DJ)"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Ciudad / País
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Lima, Perú"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    WhatsApp de Contacto
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                    <input
                      type="tel"
                      required
                      placeholder="+54 9 11 ..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Mesas del Local
                  </label>
                  <select
                    value={tables}
                    onChange={(e) => setTables(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Menos de 15 mesas">Menos de 15 mesas</option>
                    <option value="15 a 30 mesas">15 a 30 mesas</option>
                    <option value="30 a 60 mesas">30 a 60 mesas</option>
                    <option value="Más de 60 mesas (Mega Club)">Más de 60 mesas (Mega Club)</option>
                  </select>
                </div>
              </div>

              {/* Botón enviar por WhatsApp */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer hover:scale-[1.02] transition-all"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Contactar por WhatsApp para Demo VIP</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
