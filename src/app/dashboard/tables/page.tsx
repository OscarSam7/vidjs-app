"use client";

import { useState, useEffect } from "react";
import {
  QrCode,
  Building2,
  Plus,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Sparkles,
  Users,
  RefreshCw,
  X,
  Disc3,
  RotateCcw,
} from "lucide-react";

interface TableWithQr {
  id: string;
  number: number;
  label: string;
  qrToken: string;
  capacity: number;
  active: boolean;
  scanUrl: string;
  qrDataUrl: string;
  qrSvg: string;
  venue: {
    id: string;
    name: string;
  };
}

export default function TablesManagementPage() {
  const [tables, setTables] = useState<TableWithQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<string>("ALL");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Modal para imprimir plantilla
  const [printingTable, setPrintingTable] = useState<TableWithQr | null>(null);

  // Modal para crear nueva mesa
  const [isNewTableOpen, setIsNewTableOpen] = useState(false);
  const [newVenueId, setNewVenueId] = useState("");
  const [newNumber, setNewNumber] = useState<number>(1);
  const [newLabel, setNewLabel] = useState("");
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleResetTable = async (tableId: string, label: string) => {
    if (
      !confirm(
        `¿Confirmas liberar y resetear la ${label}? Esto cancelará pedidos huérfanos pendientes y liberará el cupo de la mesa para nuevos clientes.`
      )
    ) {
      return;
    }
    setResettingId(tableId);
    try {
      const res = await fetch(`/api/v1/tables/${tableId}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Mesa ${label} liberada con éxito.`);
        await fetchTables();
      } else {
        alert(data.error?.message || "Error al resetear la mesa");
      }
    } catch {
      alert("Error de conexión al resetear la mesa");
    } finally {
      setResettingId(null);
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(data.data);
        if (data.data.length > 0 && !newVenueId) {
          setNewVenueId(data.data[0].venue.id);
        }
      }
    } catch (err) {
      console.error("Error al cargar mesas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const venues = Array.from(
    new Map(tables.map((t) => [t.venue.id, t.venue.name])).entries()
  );

  const filteredTables =
    selectedVenue === "ALL"
      ? tables
      : tables.filter((t) => t.venue.id === selectedVenue);

  const handleCopy = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);

    try {
      const res = await fetch("/api/v1/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: newVenueId,
          number: newNumber,
          label: newLabel,
          capacity: newCapacity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Error al crear la mesa");
      }

      setIsNewTableOpen(false);
      setNewLabel("");
      setNewNumber(tables.length + 1);
      await fetchTables();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Error al procesar la solicitud");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              ACCESO MÓVIL CLIENTES
            </span>
            <span className="text-xs text-zinc-400">Total: {tables.length} mesas</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Gestión de Mesas y Códigos QR
          </h1>
          <p className="text-xs text-zinc-400">
            Genera, previsualiza e imprime los códigos QR para las mesas de tus locales.
          </p>
        </div>

        <button
          onClick={() => {
            setNewNumber(tables.length + 1);
            setNewLabel(`Mesa ${tables.length + 1}`);
            setIsNewTableOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Mesa</span>
        </button>
      </div>

      {/* 2. Filtro por Sede */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-zinc-500 font-medium mr-2">Filtrar por Local:</span>
        <button
          onClick={() => setSelectedVenue("ALL")}
          className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            selectedVenue === "ALL"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
          }`}
        >
          Todas las sedes ({tables.length})
        </button>

        {venues.map(([id, name]) => {
          const count = tables.filter((t) => t.venue.id === id).length;
          return (
            <button
              key={id}
              onClick={() => setSelectedVenue(id)}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedVenue === id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{name} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Grilla de Mesas con Códigos QR */}
      {loading ? (
        <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xs">Generando códigos QR vectoriales...</span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="p-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <QrCode className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">No hay mesas registradas en este local.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 hover:border-purple-600/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-purple-300 border border-zinc-700">
                      MESA #{table.number}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1">{table.label}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{table.venue.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-zinc-400 px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800">
                    <Users className="w-3 h-3 text-zinc-500" />
                    <span>{table.capacity}p</span>
                  </div>
                </div>

                {/* QR Display */}
                <div className="mt-4 p-4 rounded-xl bg-white flex items-center justify-center shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={table.qrDataUrl}
                    alt={`Código QR ${table.label}`}
                    className="w-36 h-36 object-contain"
                  />
                </div>

                <div className="text-center mt-2">
                  <div className="text-[10px] font-mono text-zinc-500 truncate">
                    {table.scanUrl}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <div className="grid grid-cols-2 gap-2">
                  {/* Abrir como Cliente */}
                  <a
                    href={`/qr/${table.qrToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Simular Escaneo</span>
                  </a>

                  {/* Imprimir Plantilla */}
                  <button
                    onClick={() => setPrintingTable(table)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Stand</span>
                  </button>
                </div>

                {/* Copiar enlace */}
                <button
                  onClick={() => handleCopy(table.scanUrl, table.qrToken)}
                  className="w-full py-1.5 px-3 rounded-lg bg-zinc-950/80 hover:bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedToken === table.qrToken ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">¡Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar Enlace de Mesa</span>
                    </>
                  )}
                </button>

                {/* Liberar / Resetear Mesa */}
                <button
                  onClick={() => handleResetTable(table.id, table.label)}
                  disabled={resettingId === table.id}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] text-amber-300 hover:text-amber-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Cancela pedidos huérfanos y renueva el cupo para los nuevos comensales"
                >
                  {resettingId === table.id ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Liberando mesa...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3 text-amber-400" />
                      <span>Liberar Mesa (Reset Rotación)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Modal de Plantilla Imprimible de Mesa */}
      {printingTable && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Plantilla para Imprimir
              </span>
              <button
                onClick={() => setPrintingTable(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Standee Imprimible Card */}
            <div
              id="printable-card"
              className="p-6 rounded-2xl bg-gradient-to-b from-zinc-900 to-black border-2 border-purple-500/40 text-center space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-center gap-2 text-purple-400">
                <Disc3 className="w-5 h-5 text-purple-400 animate-spin [animation-duration:12s]" />
                <span className="font-extrabold text-sm tracking-wider text-white">VIDJS LIVE</span>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-purple-300 tracking-widest">
                  {printingTable.venue.name}
                </div>
                <h2 className="text-2xl font-black text-white mt-0.5">
                  {printingTable.label.toUpperCase()}
                </h2>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-xl inline-block shadow-lg mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={printingTable.qrDataUrl}
                  alt={printingTable.label}
                  className="w-48 h-48 object-contain"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-white">
                  📱 ESCANEA PARA PEDIR TU CANCIÓN
                </p>
                <p className="text-[10px] text-zinc-400">
                  Sin descargas ni registros &bull; Directo a la cabina del DJ
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Tarjeta</span>
              </button>
              <button
                onClick={() => setPrintingTable(null)}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal de Crear Mesa */}
      {isNewTableOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Registrar Nueva Mesa</h3>
              </div>
              <button
                onClick={() => setIsNewTableOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTable} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Local / Sede *</label>
                <select
                  value={newVenueId}
                  onChange={(e) => setNewVenueId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  {venues.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Número de Mesa *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newNumber}
                    onChange={(e) => setNewNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Capacidad (Personas)</label>
                  <input
                    type="number"
                    min={1}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Etiqueta de la Mesa *</label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ej: Mesa 7 (Patio) / VIP Box 2"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creating ? "Generando QR..." : "Crear Mesa y Generar QR"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewTableOpen(false)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
