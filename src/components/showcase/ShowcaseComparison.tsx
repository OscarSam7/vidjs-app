"use client";

import { Check, X, Sparkles, ShieldAlert } from "lucide-react";

export function ShowcaseComparison() {
  const features = [
    {
      name: "Consola Dual-Deck Web con Video Streaming HD",
      vidjs: true,
      spotify: false,
      traditionalDj: true,
      oldKaraoke: false,
    },
    {
      name: "Peticiones de Comensales por QR (Cero Apps por Descargar)",
      vidjs: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Algoritmo Anti-Monopolio de Micrófono ('Canta y Libera')",
      vidjs: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Sistema de 'Super Votos' Condicionados al Consumo en Barra",
      vidjs: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Salida para Pantalla Gigante TV con Publicidad y Letras",
      vidjs: true,
      spotify: false,
      traditionalDj: "Requiere hardware extra",
      oldKaraoke: true,
    },
    {
      name: "Transición Automática sin Silencios DJ <-> Karaoke",
      vidjs: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Biblioteca Musical Centralizada Propiedad del Local",
      vidjs: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Panel de Auditoría y Métricas de Consumo en Tiempo Real",
      vidjs: true,
      spotify: false,
      traditionalDj: false,
      oldKaraoke: false,
    },
    {
      name: "Cero Hardware Costoso ($0 en Consolas de $3.000)",
      vidjs: true,
      spotify: true,
      traditionalDj: false,
      oldKaraoke: false,
    },
  ];

  return (
    <section id="comparativa" className="py-24 bg-zinc-950 relative border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs font-bold text-purple-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Análisis Comparativo de Mercado</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            ¿Por qué Vidjs Pro Aplasta a las{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Soluciones Tradicionales?
            </span>
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Compara cómo Vidjs Pro une en un solo ecosistema lo que antes requería 4 programas incompatibles y miles de dólares en equipos.
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
                <th className="py-5 px-4 text-center bg-purple-950/40 text-purple-300 font-black border-x border-purple-500/30 text-sm">
                  <div className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>VIDJS PRO</span>
                  </div>
                  <span className="text-[10px] text-purple-400 block font-normal mt-0.5">
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

                  {/* Vidjs Pro Column (Destacada) */}
                  <td className="py-4 px-4 text-center bg-purple-950/20 border-x border-purple-500/20">
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
