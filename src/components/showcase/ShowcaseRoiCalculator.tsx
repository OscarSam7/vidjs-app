"use client";

import { useState } from "react";
import { DollarSign, TrendingUp, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";

interface ShowcaseRoiCalculatorProps {
  onOpenDemoModal: () => void;
}

export function ShowcaseRoiCalculator({ onOpenDemoModal }: ShowcaseRoiCalculatorProps) {
  const [tablesCount, setTablesCount] = useState<number>(24);
  const [averageTicket, setAverageTicket] = useState<number>(35); // En USD o miles locales
  const [nightsPerMonth, setNightsPerMonth] = useState<number>(12); // Típico: jue, vie, sáb x 4 semanas

  // Cálculos de impacto comercial
  const currentMonthlyGross = tablesCount * averageTicket * nightsPerMonth;
  // +20% por mayor permanencia esperando canciones y turnos
  const extraRetentionRevenue = Math.round(currentMonthlyGross * 0.20);
  // +15% por consumo mínimo incentivado por los Super Votos
  const extraSuperVotesRevenue = Math.round(currentMonthlyGross * 0.15);
  // Total beneficio mensual adicional estimado
  const totalExtraRevenue = extraRetentionRevenue + extraSuperVotesRevenue;
  const growthPercentage = 35;

  return (
    <section id="calculadora-roi" className="py-24 bg-[#07070a] relative border-t border-zinc-900">
      {/* Luz ambiental verde de rentabilidad */}
      <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-emerald-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-xs font-bold text-emerald-300 mb-3">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Calculadora Comercial de Retorno de Inversión (ROI)</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            ¿Cuánto Dinero Extra Puede Generar{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              tu Local Cada Mes?
            </span>
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Ajusta los parámetros según tu establecimiento y descubre el impacto directo en tu facturación mensual.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Columna Izquierda: Sliders interactivos */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-zinc-900/90 border border-zinc-800 space-y-6 shadow-xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Parámetros de tu Establecimiento</span>
            </h3>

            {/* Slider 1: Número de Mesas */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-300">Mesas Activas del Local:</span>
                <span className="text-cyan-400 font-mono text-base px-2.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                  {tablesCount} mesas
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="80"
                step="2"
                value={tablesCount}
                onChange={(e) => setTablesCount(Number(e.target.value))}
                className="w-full accent-cyan-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>8 mesas (Bar chico)</span>
                <span>80 mesas (Mega Club)</span>
              </div>
            </div>

            {/* Slider 2: Ticket Promedio por Mesa */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-300">Ticket Promedio por Mesa:</span>
                <span className="text-emerald-400 font-mono text-base px-2.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                  ${averageTicket} USD / Val.
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={averageTicket}
                onChange={(e) => setAverageTicket(Number(e.target.value))}
                className="w-full accent-emerald-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>$15 USD</span>
                <span>$120 USD</span>
              </div>
            </div>

            {/* Slider 3: Noches Operativas al Mes */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-zinc-300">Noches con Música / Evento al Mes:</span>
                <span className="text-purple-400 font-mono text-base px-2.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                  {nightsPerMonth} noches
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="1"
                value={nightsPerMonth}
                onChange={(e) => setNightsPerMonth(Number(e.target.value))}
                className="w-full accent-purple-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>4 noches (1 por fin de semana)</span>
                <span>24 noches (6 por semana)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cálculo fundamentado en casos reales de bares con Vidjs Pro implementado.</span>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Proyección de Ganancias */}
          <div className="lg:col-span-6 p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-emerald-950/40 via-zinc-900 to-zinc-950 border-2 border-emerald-500/40 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/50 text-xs font-mono font-black text-emerald-300">
                CRECIMIENTO ESTIMADO: +{growthPercentage}%
              </span>
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider font-mono text-zinc-400">
                Ingreso Adicional Estimado por Mes
              </div>
              <div className="text-4xl sm:text-6xl font-black text-white tracking-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
                +${totalExtraRevenue.toLocaleString()} USD
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Sobre una facturación base estimada de ${currentMonthlyGross.toLocaleString()} USD
              </div>
            </div>

            {/* Desglose de dónde proviene el dinero extra */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Mayor Permanencia por Espera de Temas (+20%):
                </span>
                <span className="font-bold font-mono text-cyan-300">
                  +${extraRetentionRevenue.toLocaleString()} USD
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-zinc-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Super Votos por Consumo Mínimo en Barra (+15%):
                </span>
                <span className="font-bold font-mono text-emerald-300">
                  +${extraSuperVotesRevenue.toLocaleString()} USD
                </span>
              </div>
            </div>

            {/* Llamado a la acción del ROI */}
            <button
              type="button"
              onClick={onOpenDemoModal}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-base shadow-xl shadow-emerald-950/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Quiero Activar Este Crecimiento en mi Local</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
