"use client";

import { useState } from "react";
import { Users, Music, Radio, Sparkles, Clock } from "lucide-react";

export type TableRoomStatus = "IDLE" | "CONNECTED" | "WAITING" | "SINGING";

export interface RoomTableItem {
  id: string;
  number: number;
  label: string;
  capacity: number;
  status: TableRoomStatus;
  guestCount: number;
  currentSong?: {
    title: string;
    artist?: string;
  } | null;
  pendingSong?: {
    title: string;
    artist?: string;
  } | null;
}

interface RoomMapMiniProps {
  tables: RoomTableItem[];
  venueName?: string;
}

export default function RoomMapMini({ tables, venueName }: RoomMapMiniProps) {
  const [selectedTable, setSelectedTable] = useState<RoomTableItem | null>(null);

  const getStatusColor = (status: TableRoomStatus) => {
    switch (status) {
      case "SINGING":
        return "bg-purple-900/60 border-purple-500 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-pulse";
      case "WAITING":
        return "bg-amber-950/60 border-amber-500/80 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.25)]";
      case "CONNECTED":
        return "bg-cyan-950/50 border-cyan-500/70 text-cyan-200";
      default:
        return "bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:border-zinc-700";
    }
  };

  const getStatusLabel = (status: TableRoomStatus) => {
    switch (status) {
      case "SINGING":
        return "Sonando en Vivo";
      case "WAITING":
        return "En Cola / Esperando";
      case "CONNECTED":
        return "Clientes Conectados";
      default:
        return "Mesa Disponible";
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera & Leyenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Mapa Operativo de Sala</span>
            {venueName && <span className="text-zinc-400 font-normal">&bull; {venueName}</span>}
          </h3>
          <p className="text-[11px] text-zinc-400">
            Monitoreo en tiempo real de mesas y estado de consumo de entretenimiento
          </p>
        </div>

        {/* Leyenda de colores */}
        <div className="flex items-center gap-2.5 text-[10px] text-zinc-400 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>En Vivo</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>En Cola</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Conectada</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span>Inactiva</span>
          </div>
        </div>
      </div>

      {/* Grid de Mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {tables.map((table) => {
          const colorClass = getStatusColor(table.status);
          const isSelected = selectedTable?.id === table.id;

          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              className={`p-3 rounded-xl border text-left transition-all relative group cursor-pointer ${colorClass} ${
                isSelected ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-zinc-950" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black tracking-tight text-white">
                  M{table.number}
                </span>
                {table.status === "SINGING" && (
                  <Radio className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                )}
                {table.status === "WAITING" && (
                  <Clock className="w-3 h-3 text-amber-300" />
                )}
                {table.status === "CONNECTED" && (
                  <Users className="w-3 h-3 text-cyan-300" />
                )}
              </div>

              <div className="text-[11px] font-medium truncate text-zinc-300">
                {table.label}
              </div>

              <div className="text-[10px] mt-1 flex items-center justify-between opacity-80">
                <span>Cap: {table.capacity}p</span>
                {table.guestCount > 0 && (
                  <span className="font-bold">{table.guestCount} QR</span>
                )}
              </div>

              {table.currentSong && (
                <div className="mt-1.5 pt-1.5 border-t border-purple-500/30 text-[9px] text-purple-200 truncate font-semibold">
                  🎵 {table.currentSong.title}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detalle de Mesa Seleccionada */}
      {selectedTable && (
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-sm font-black text-white">
              M{selectedTable.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{selectedTable.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {getStatusLabel(selectedTable.status)}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Capacidad: {selectedTable.capacity} personas &bull; {selectedTable.guestCount} clientes con sesión activa
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedTable.currentSong && (
              <div className="text-right">
                <div className="text-[10px] text-purple-400 font-bold uppercase">Sonando Ahora</div>
                <div className="text-xs text-white font-medium">{selectedTable.currentSong.title}</div>
              </div>
            )}
            {selectedTable.pendingSong && !selectedTable.currentSong && (
              <div className="text-right">
                <div className="text-[10px] text-amber-400 font-bold uppercase">En Espera</div>
                <div className="text-xs text-white font-medium">{selectedTable.pendingSong.title}</div>
              </div>
            )}
            <button
              onClick={() => setSelectedTable(null)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
