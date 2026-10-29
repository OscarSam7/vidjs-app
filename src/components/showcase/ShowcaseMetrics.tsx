"use client";

import { TrendingUp, Users, Clock, ShieldCheck, DollarSign, Sparkles } from "lucide-react";

export function ShowcaseMetrics() {
  const metrics = [
    {
      icon: DollarSign,
      value: "+34%",
      label: "Incremento en Ventas de Barra",
      description: "Impulsado directamente por los 'Super Votos' condicionados al consumo mínimo de la mesa.",
      accent: "from-emerald-500/20 to-emerald-950/40 text-emerald-400 border-emerald-500/30",
    },
    {
      icon: Clock,
      value: "4.2x",
      label: "Mayor Tiempo de Permanencia",
      description: "Los grupos se quedan hasta 2 horas más en el local esperando su turno de karaoke o tema pedido.",
      accent: "from-cyan-500/20 to-cyan-950/40 text-cyan-400 border-cyan-500/30",
    },
    {
      icon: Users,
      value: "100%",
      label: "Mesas Conectadas en Simultáneo",
      description: "Sin colas en la barra ni papeles al DJ. Cada comensal usa su teléfono de forma autónoma.",
      accent: "from-purple-500/20 to-purple-950/40 text-purple-400 border-purple-500/30",
    },
    {
      icon: Sparkles,
      value: "$0",
      label: "Gasto en Hardware Dedicado",
      description: "No requiere consolas de $3.000 ni cables especiales. Funciona con cualquier laptop, tablet y Smart TV.",
      accent: "from-amber-500/20 to-amber-950/40 text-amber-400 border-amber-500/30",
    },
  ];

  return (
    <section className="py-16 bg-zinc-950/80 border-y border-zinc-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700/60 text-xs font-semibold text-zinc-300 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Métricas Comprobadas en el Sector Gastronómico y Nocturno</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Diseñado para la Rentabilidad del Local y el Éxito del DJ
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base mt-2">
            No es solo música: es una máquina interactiva de fidelización y aumento de ticket promedio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className={`p-6 rounded-2xl bg-gradient-to-b ${item.accent} border backdrop-blur-md relative overflow-hidden group hover:scale-[1.02] transition-all`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-950/80 flex items-center justify-center border border-zinc-800 shadow-inner">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                    KPI #0{idx + 1}
                  </span>
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
                  {item.value}
                </div>
                <div className="text-base font-bold text-zinc-200 mb-2">
                  {item.label}
                </div>
                <div className="text-xs text-zinc-400 leading-relaxed">
                  {item.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
