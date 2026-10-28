"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, ArrowRight, Lock, Award, Mic } from "lucide-react";

export default function JudgeIndexPage() {
  const router = useRouter();
  const [contestCode, setContestCode] = useState("");
  const [pin, setPin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestCode.trim()) return;
    const cleanCode = contestCode.trim().toUpperCase();
    const query = pin.trim() ? `?pin=${encodeURIComponent(pin.trim())}` : "";
    router.push(`/judge/${cleanCode}${query}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-zinc-950">
            <Trophy className="w-9 h-9" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            Portal del Jurado Oficial
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Ingresa el código del certamen o escanea el QR facilitado por el DJ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Código del Concurso
            </label>
            <input
              type="text"
              value={contestCode}
              onChange={(e) => setContestCode(e.target.value.toUpperCase())}
              placeholder="EJ: CONCURSO-7K9A"
              className="w-full text-center text-xl font-mono tracking-widest py-3 rounded-2xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none text-white placeholder:text-zinc-700 transition-all font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              PIN de Jurado (Opcional)
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full text-center text-xl font-mono tracking-[0.3em] py-3 rounded-2xl bg-zinc-950 border border-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none text-amber-300 placeholder:text-zinc-700 transition-all font-black"
            />
          </div>

          <button
            type="submit"
            disabled={!contestCode.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Ingresar a Calificar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
