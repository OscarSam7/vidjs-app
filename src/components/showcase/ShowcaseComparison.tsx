"use client";

import { Check, X, Sparkles, ShieldAlert } from "lucide-react";

export function ShowcaseComparison() {
  const features = [
    {
      name: "Audio Cabina Pro & Auto-DJ Ping-Pong con EQ 3-Bandas",
      cynko: true,
      spotify: false,
      traditionalDj: "Software extra ($300+)",
      oldKaraoke: false,
    },
    {
      name: "Restaurante POS & Pantalla KDS de Cocina en Tiempo Real",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Beeper Digital QR PWA (Localizador Háptico sin Hardware Físico)",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Control de Asistencia de Personal con Claves CK-XXXX & GPS",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Control de Acceso QR Criptográfico HMAC-SHA256 (0.2s) & Modo Offline",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Reservas VIP de Camarotes con Fotos Reales de Decoración",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Peticiones de Comensales por QR (Cero Apps por Descargar)",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Algoritmo Anti-Monopolio de Micrófono ('Canta y Libera')",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Sistema de 'Super Votos' Condicionados al Consumo en Barra",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Salida para Pantalla Gigante Smart TV 4K con Letras y Cumpleaños",
      cynko: true,
      spotify: false,
      traditionalDj: "Requiere hardware extra",
      oldKaraoke: true,
    },
    {
      name: "Transición Automática sin Silencios DJ <-> Karaoke",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Biblioteca Musical Centralizada Propiedad del Establecimiento",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "White-Label & PWA Propia con Logo y Paleta Neón del Local",
      cynko: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Cero Hardware Costoso ($0 en Consolas de $3.000 o Beepers)",
      cynko: true,
      spotify: true,
      traditionalDj: false,
      oldKaraoke: false,
    },
  ];

  return (
    <section id="comparativa" className="py-24 bg-zinc-950 relative border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/30 text-xs font-bold text-fuchsia-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Análisis Comparativo de Mercado</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            ¿Por qué CYNKO OS Supera a las{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
              Soluciones Tradicionales?
            </span>
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Compara cómo CYNKO OS unifica en una sola plataforma cloud lo que antes exigía 5 programas incompatibles, costosos beepers de hardware y miles de dólares en licencias.
          </p>
        </div>

        {/* Tabla comparativa responsive */}
        <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-md shadow-2xl">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-mono uppercase">
                <th className="py-5 px-6 text-zinc-400 font-bold w-2/5">
                  Funcionalidad / Capacidad
                </th>
                <th className="py-5 px-4 text-center bg-fuchsia-950/40 text-fuchsia-300 font-black border-x border-fuchsia-500/30 text-sm">
                  <div className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>CYNKO OS</span>
                  </div>
                  <span className="text-[10px] text-fuchsia-400 block font-normal mt-0.5">
                    Ecosistema 360°
                  </span>
                </th>
                <th className="py-5 px-4 text-center text-zinc-400">
                  Spotify / YouTube
                  <span className="text-[10px] text-zinc-500 block font-normal mt-0.5">
                    Música suelta
                  </span>
                </th>
                <th className="py-5 px-4 text-center text-zinc-400">
                  Software DJ Tradicional
                  <span className="text-[10px] text-zinc-500 block font-normal mt-0.5">
                    VirtualDJ / Serato
                  </span>
                </th>
                <th className="py-5 px-4 text-center text-zinc-400">
                  Karaoke Antiguo
                  <span className="text-[10px] text-zinc-500 block font-normal mt-0.5">
                    Discos / Cuadernos
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-xs sm:text-sm">
              {features.map((item, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-4 px-6 font-semibold text-zinc-200">
                    {item.name}
                  </td>

                  {/* CYNKO OS Column (Destacada) */}
                  <td className="py-4 px-4 text-center bg-fuchsia-950/20 border-x border-fuchsia-500/20">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </td>

                  {/* Spotify */}
                  <td className="py-4 px-4 text-center text-zinc-500">
                    {item.spotify ? (
                      <Check className="w-4 h-4 text-zinc-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-red-500/60 mx-auto" />
                    )}
                  </td>

                  {/* Traditional DJ */}
                  <td className="py-4 px-4 text-center text-zinc-500">
                    {typeof item.traditionalDj === "string" ? (
                      <span className="text-[10px] text-amber-400 font-mono">
                        {item.traditionalDj}
                      </span>
                    ) : item.traditionalDj ? (
                      <Check className="w-4 h-4 text-zinc-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-red-500/60 mx-auto" />
                    )}
                  </td>

                  {/* Old Karaoke */}
                  <td className="py-4 px-4 text-center text-zinc-500">
                    {item.oldKaraoke ? (
                      <Check className="w-4 h-4 text-zinc-400 mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-red-500/60 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
