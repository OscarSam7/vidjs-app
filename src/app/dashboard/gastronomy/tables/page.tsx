"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Plus,
  QrCode,
  ArrowLeftRight,
  GitMerge,
  Split,
  Users,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { useRealtime } from "@/hooks/use-realtime";
import { formatGuaranies, GASTRO_TABLE_STATUS_LABELS } from "@/lib/gastronomy/format";

export default function GastronomyTablesAndSectorsPage() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [activeTable, setActiveTable] = useState<any>(null);

  // Formularios rápidos
  const [newSectorName, setNewSectorName] = useState("");
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableSectorId, setNewTableSectorId] = useState("");

  // Operaciones de cuenta
  const [targetTableId, setTargetTableId] = useState("");
  const [splitParts, setSplitParts] = useState(2);
  const [splitResult, setSplitResult] = useState<any[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/v1/gastronomy/tables");
    if (res.ok) {
      const json = await res.json();
      setSectors(json.sectors || []);
      setTables(json.tables || []);
      if (!newTableSectorId && json.sectors?.length > 0) {
        setNewTableSectorId(json.sectors[0].id);
      }
    }
  }, [newTableSectorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime({
    eventId: "global",
    onEvent: (type) => {
      if (type.startsWith("GASTRO_")) loadData();
    },
  });

  const execTableAction = async (payload: any, successMsg: string) => {
    const res = await fetch("/api/v1/gastronomy/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error?.message || "No se pudo completar la operación");
      return null;
    }
    setToast(successMsg);
    setTimeout(() => setToast(null), 4000);
    await loadData();
    return json;
  };

  const filteredTables = tables.filter(
    (t) => selectedSector === "ALL" || t.sectorId === selectedSector
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between">
          <span>✓ {toast}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-purple-400" />
            <span>Plano Visual de Mesas, Sectores y Cuentas</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sectores: Salón principal, Barra, Terraza, VIP, Discoteca, Camarotes, Patio y Reservados. Soporta transferencia de mesas, unificación y división de cuentas.
          </p>
        </div>

        {/* Crear Sector Rápido */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newSectorName.trim()) return;
            await execTableAction(
              { action: "CREATE_SECTOR", sectorName: newSectorName.trim() },
              `Sector "${newSectorName}" creado`
            );
            setNewSectorName("");
          }}
          className="flex items-center gap-2 text-xs"
        >
          <input
            type="text"
            placeholder="Nuevo sector (ej: VIP Deck)"
            value={newSectorName}
            onChange={(e) => setNewSectorName(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-white"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Sector</span>
          </button>
        </form>
      </div>

      {/* Filtro por Sectores + Crear Mesa */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSector("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
              selectedSector === "ALL"
                ? "bg-purple-600 text-white"
                : "bg-[#0D1930] text-slate-300 border border-[#263858]"
            }`}
          >
            Todos los sectores ({tables.length})
          </button>
          {sectors.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setSelectedSector(sec.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                selectedSector === sec.id
                  ? "bg-purple-600 text-white"
                  : "bg-[#0D1930] text-slate-300 border border-[#263858]"
              }`}
            >
              {sec.name}
            </button>
          ))}
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await execTableAction(
              {
                action: "CREATE_TABLE",
                label: newTableLabel.trim() || `Mesa ${tables.length + 1}`,
                capacity: newTableCapacity,
                sectorId: newTableSectorId || undefined,
              },
              "Nueva mesa agregada al plano"
            );
            setNewTableLabel("");
          }}
          className="flex flex-wrap items-center gap-2 text-xs bg-[#0D1930] p-2 rounded-2xl border border-[#263858]"
        >
          <input
            type="text"
            placeholder={`Mesa ${tables.length + 1}`}
            value={newTableLabel}
            onChange={(e) => setNewTableLabel(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#080F1F] border border-[#263858] text-white w-32"
          />
          <select
            value={newTableSectorId}
            onChange={(e) => setNewTableSectorId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#080F1F] border border-[#263858] text-white"
          >
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={30}
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg bg-[#080F1F] border border-[#263858] text-white w-16"
            title="Capacidad"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Mesa</span>
          </button>
        </form>
      </div>

      {/* Plano Visual Interactivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredTables.map((tbl) => {
            const st = GASTRO_TABLE_STATUS_LABELS[tbl.tableStatus] || {
              label: tbl.tableStatus,
              color: "bg-zinc-800 text-zinc-300",
            };
            const isSelected = activeTable?.id === tbl.id;

            return (
              <div
                key={tbl.id}
                onClick={() => {
                  setActiveTable(tbl);
                  setSplitResult(
                    tbl.activeSession?.splitAccountsJson
                      ? JSON.parse(tbl.activeSession.splitAccountsJson)
                      : null
                  );
                }}
                className={`p-4 rounded-3xl bg-[#0D1930] border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "border-purple-400 ring-2 ring-purple-500/40 shadow-xl"
                    : "border-[#263858] hover:border-purple-500/50"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-purple-300">
                      #{tbl.number} • {tbl.sector?.name || tbl.zone}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-white">{tbl.label}</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {tbl.capacity}p
                    </span>
                  </div>

                  {tbl.activeSession ? (
                    <div className="p-2.5 rounded-xl bg-[#080F1F] border border-purple-500/30 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sesión:</span>
                        <span className="font-mono text-purple-300">{tbl.activeSession.sessionCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Responsable:</span>
                        <span className="font-bold text-white truncate max-w-[120px]">
                          {tbl.activeSession.customerName || "Cliente"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Consumo:</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {formatGuaranies(tbl.activeSession.totalCents)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#080F1F]/60 border border-[#1E2E4A] text-[11px] text-slate-400">
                      Sin cuenta abierta actualmente
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1E2E4A] text-[11px]">
                  <Link
                    href={`/menu?qrToken=${tbl.qrToken}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Abrir QR Cliente</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span className="text-slate-500">Clic para operar</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel Lateral de Operaciones de Mesa Seleccionada */}
        <div className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] space-y-4 h-fit">
          {!activeTable ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Selecciona una mesa del plano visual para cambiar su estado, ver su código QR, transferir pedidos, unificar cuentas o dividir la cuenta entre varios clientes.
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#263858] pb-3">
                <div>
                  <span className="text-[10px] font-mono text-purple-300 uppercase">
                    MESA #{activeTable.number} • {activeTable.sector?.name || activeTable.zone}
                  </span>
                  <h2 className="text-lg font-black text-white">{activeTable.label}</h2>
                </div>
                {activeTable.qrDataUrl && (
                  <img
                    src={activeTable.qrDataUrl}
                    alt="QR"
                    className="w-14 h-14 rounded-xl bg-white p-1"
                  />
                )}
              </div>

              {/* Cambiar Estado de la Mesa */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">Cambiar Estado Operativo:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(GASTRO_TABLE_STATUS_LABELS).map(([code, info]) => (
                    <button
                      key={code}
                      onClick={() =>
                        execTableAction(
                          {
                            action: "UPDATE_TABLE_STATUS",
                            tableId: activeTable.id,
                            tableStatus: code,
                          },
                          `Estado de ${activeTable.label} cambiado a ${info.label}`
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold text-left ${
                        activeTable.tableStatus === code
                          ? "bg-purple-600 text-white border-purple-400"
                          : "bg-[#080F1F] text-slate-300 border-[#263858]"
                      }`}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transferir Pedidos o Unificar Cuentas con otra Mesa */}
              <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-2.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                  <span>Transferir o Unificar con otra Mesa</span>
                </div>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full p-2 rounded-xl bg-[#0D1930] border border-[#263858] text-white"
                >
                  <option value="">Seleccionar mesa destino...</option>
                  {tables
                    .filter((t) => t.id !== activeTable.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.sector?.name || t.zone})
                      </option>
                    ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={!targetTableId}
                    onClick={() =>
                      execTableAction(
                        {
                          action: "TRANSFER_TABLE_SESSION",
                          sourceTableId: activeTable.id,
                          targetTableId,
                        },
                        "Pedidos y sesión transferidos con éxito"
                      )
                    }
                    className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Transferir Mesa</span>
                  </button>
                  <button
                    disabled={!targetTableId}
                    onClick={() =>
                      execTableAction(
                        {
                          action: "MERGE_TABLE_SESSIONS",
                          sourceTableId: activeTable.id,
                          targetTableId,
                        },
                        "Cuentas unificadas exitosamente"
                      )
                    }
                    className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-1"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Unificar Cuentas</span>
                  </button>
                </div>
              </div>

              {/* Dividir Cuenta entre varios Clientes */}
              <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-2.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Split className="w-4 h-4 text-amber-400" />
                  <span>Dividir Cuenta entre Clientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={splitParts}
                    onChange={(e) => setSplitParts(Number(e.target.value))}
                    className="w-20 p-2 rounded-xl bg-[#0D1930] border border-[#263858] text-white"
                  />
                  <button
                    onClick={async () => {
                      const res = await execTableAction(
                        {
                          action: "SPLIT_TABLE_SESSION",
                          tableId: activeTable.id,
                          splitParts,
                        },
                        `Cuenta dividida entre ${splitParts} clientes`
                      );
                      if (res?.splitAccounts) {
                        setSplitResult(res.splitAccounts);
                      }
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                  >
                    Calcular División ({splitParts} personas)
                  </button>
                </div>

                {splitResult && splitResult.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-[#1E2E4A]">
                    {splitResult.map((s: any) => (
                      <div key={s.index} className="flex justify-between text-[11px]">
                        <span className="text-slate-300">{s.guestName}:</span>
                        <span className="font-mono font-bold text-emerald-300">
                          {formatGuaranies(s.amountCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Liberar y Cerrar Sesión */}
              <button
                onClick={() =>
                  execTableAction(
                    {
                      action: "CLOSE_TABLE_SESSION",
                      tableId: activeTable.id,
                    },
                    `${activeTable.label} liberada y disponible`
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cerrar Cuenta y Liberar Mesa</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
