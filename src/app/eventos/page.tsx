"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Heart,
  ChevronRight,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export default function PublicEventsDirectoryPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/v1/events/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.events) {
          setEvents(data.events);
        }
      })
      .catch((err) => console.error("Error loading events:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = ["TODOS", "GASTRONOMIA", "CONCIERTO", "FIESTA", "FESTIVAL"];

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "TODOS" ||
      evt.eventType.toUpperCase() === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#080F1F] text-slate-100 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A1322]/90 border-b border-[#263858] backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/guest" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-900/40">
              <Ticket className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">VIDJS</span>
              <span className="text-[10px] font-mono text-purple-400 block -mt-1 font-bold">
                TICKETS & EVENTS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/guest"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-600/30 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Mi App / Billetera</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <Badge variant="primary" className="text-xs px-3 py-1 font-bold">
            Cartelera Oficial en Vivo
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Próximos Eventos & Entradas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Descubre las mejores fiestas, conciertos y experiencias gastronómicas. Adquiere tus boletos con QR oficial al instante.
          </p>
        </div>

        {/* Search & Categories Filters */}
        <div className="space-y-3 max-w-3xl mx-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre de evento, artista o lugar (ej: Crocco, Rumba Stage)..."
              className="pl-10 bg-[#0A1322] border-[#263858] text-white text-xs h-11 rounded-2xl shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                    : "bg-[#0A1322] border border-[#263858] text-slate-400 hover:text-white hover:border-slate-500"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando eventos publicados...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 bg-[#0A1322] border border-[#263858] rounded-3xl p-8 max-w-md mx-auto">
            <Ticket className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">No se encontraron eventos</p>
            <p className="text-xs text-slate-400 mt-1">Prueba con otra palabra o categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {filteredEvents.map((evt) => {
              const minPrice =
                evt.tiers && evt.tiers.length > 0
                  ? Math.min(...evt.tiers.map((t: any) => t.price))
                  : 25000;

              return (
                <div
                  key={evt.id}
                  className="bg-[#0A1322] border border-[#263858] hover:border-purple-500/60 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-950/20 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Flyer thumbnail */}
                    <div className="relative h-48 overflow-hidden bg-black">
                      <img
                        src={evt.bannerUrl}
                        alt={evt.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white uppercase tracking-wider shadow">
                          {evt.eventType}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white drop-shadow">
                        <span className="flex items-center gap-1 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span>{evt.locationName}</span>
                        </span>
                        <span className="text-[10px] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-amber-300 font-bold">
                          ★ {evt.rating?.toFixed(1) || "4.8"}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-2.5">
                      <span className="text-[11px] text-purple-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{evt.timeSchedule || "Próximamente"}</span>
                      </span>

                      <h3 className="text-lg font-black text-white leading-tight line-clamp-1 group-hover:text-purple-300 transition-colors">
                        {evt.name}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom / Price & CTA */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-[#263858] flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Entradas desde</span>
                        <span className="text-sm font-black text-white font-mono">
                          Gs. {minPrice.toLocaleString("es-PY")}
                        </span>
                      </div>

                      <Link
                        href={`/eventos/${evt.code}`}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-purple-900/40 group-hover:gap-1.5 transition-all"
                      >
                        <span>Adquirir</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
