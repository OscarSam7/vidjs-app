"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Printer,
  Download,
  Copy,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  Headphones,
  RotateCcw,
  UtensilsCrossed,
  X,
  MapPin,
  Palette,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { VipSelectModal } from "@/components/ui/VipSelectModal";
import { useRealtime } from "@/hooks/use-realtime";
import { formatGuaranies, GASTRO_TABLE_STATUS_LABELS } from "@/lib/gastronomy/format";
import ManualRequestModal from "@/components/dj/ManualRequestModal";

export default function GastronomyTablesAndSectorsPage() {
  const [sectors, setSectors] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Derivar la mesa activa memoizada para evitar bucles infinitos de re-render
  const activeTable = useMemo(() => {
    if (!activeTableId) return null;
    return tables.find((t) => t.id === activeTableId) || null;
  }, [tables, activeTableId]);

  // Formularios rápidos de creación
  const [newSectorName, setNewSectorName] = useState("");
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableSectorId, setNewTableSectorId] = useState("");

  // Modal Crear Sector VIP
  const [isCreateSectorModalOpen, setIsCreateSectorModalOpen] = useState(false);
  const [sectorNameInput, setSectorNameInput] = useState("");
  const [sectorCodeInput, setSectorCodeInput] = useState("");
  const [sectorColorInput, setSectorColorInput] = useState("#8B5CF6");

  // Modal Editar Sector VIP
  const [editingSector, setEditingSector] = useState<any>(null);
  const [editSectorName, setEditSectorName] = useState("");
  const [editSectorColor, setEditSectorColor] = useState("#8B5CF6");

  // Modal Eliminar Sector VIP
  const [deletingSector, setDeletingSector] = useState<any>(null);
  const [deleteSectorCascade, setDeleteSectorCascade] = useState(false);

  // Modal Crear Mesa VIP
  const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState(false);
  const [createTableLabel, setCreateTableLabel] = useState("");
  const [createTableNumber, setCreateTableNumber] = useState<number>(1);
  const [createTableCapacity, setCreateTableCapacity] = useState<number>(4);
  const [createTableSectorId, setCreateTableSectorId] = useState("");
  const [createTableZone, setCreateTableZone] = useState("DJ");

  // Modal Eliminar Mesa VIP
  const [deletingTable, setDeletingTable] = useState<any>(null);

  // Edición de Mesa
  const [editingTable, setEditingTable] = useState<any>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editNumber, setEditNumber] = useState(1);
  const [editCapacity, setEditCapacity] = useState(4);
  const [editSectorId, setEditSectorId] = useState("");
  const [editRegenerateQr, setEditRegenerateQr] = useState(false);

  // Modal de Impresión Acrílico QR
  const [printingTable, setPrintingTable] = useState<any>(null);
  const [qrMode, setQrMode] = useState<"UNIFIED" | "MENU_ONLY">("UNIFIED");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal para Pedido Musical DJ/Karaoke desde la Mesa
  const [musicOrderTableId, setMusicOrderTableId] = useState<string | null>(null);

  // Operaciones de cuenta gastronómica
  const [targetTableId, setTargetTableId] = useState("");
  const [splitParts, setSplitParts] = useState(2);
  const [splitResult, setSplitResult] = useState<any[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/gastronomy/tables", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setSectors(json.sectors || []);
        setTables(json.tables || []);
        if (json.activeEvent) setActiveEvent(json.activeEvent);
        setNewTableSectorId((prev) => prev || json.sectors?.[0]?.id || "");
      }
    } catch (err) {
      console.error("Error al cargar mesas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtime({
    eventId: "global",
    onEvent: (type) => {
      if (type.startsWith("GASTRO_") || type.startsWith("TABLE_")) loadData();
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
    showToast(successMsg);
    await loadData();
    return json;
  };

  const handleOpenEditModal = (t: any) => {
    setEditingTable(t);
    setEditLabel(t.label || `Mesa ${t.number}`);
    setEditNumber(t.number || 1);
    setEditCapacity(t.capacity || 4);
    setEditSectorId(t.sectorId || sectors[0]?.id || "");
    setEditRegenerateQr(false);
  };

  const handleSaveEditTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    const res = await execTableAction(
      {
        action: "EDIT_TABLE",
        tableId: editingTable.id,
        number: Number(editNumber),
        label: editLabel.trim(),
        capacity: Number(editCapacity),
        sectorId: editSectorId || undefined,
        regenerateQr: editRegenerateQr,
      },
      `Mesa "${editLabel}" actualizada correctamente`
    );
    if (res) setEditingTable(null);
  };

  const SECTOR_PALETTE = [
    { name: "Púrpura VIP", hex: "#8B5CF6" },
    { name: "Dorado Ámbar", hex: "#F59E0B" },
    { name: "Esmeralda", hex: "#10B981" },
    { name: "Cian Neón", hex: "#06B6D4" },
    { name: "Rosa Fiesta", hex: "#EC4899" },
    { name: "Azul Eléctrico", hex: "#3B82F6" },
    { name: "Índigo", hex: "#6366F1" },
    { name: "Rojo Rubí", hex: "#EF4444" },
  ];

  // Handlers para Sectores
  const handleOpenCreateSectorModal = () => {
    setSectorNameInput("");
    setSectorCodeInput("");
    setSectorColorInput("#8B5CF6");
    setIsCreateSectorModalOpen(true);
  };

  const handleCreateSectorModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorNameInput.trim()) return;
    const res = await execTableAction(
      {
        action: "CREATE_SECTOR",
        sectorName: sectorNameInput.trim(),
        sectorCode: sectorCodeInput.trim() || undefined,
        colorHex: sectorColorInput,
      },
      `Sector "${sectorNameInput.trim()}" creado exitosamente`
    );
    if (res) {
      setSectorNameInput("");
      setSectorCodeInput("");
      setIsCreateSectorModalOpen(false);
    }
  };

  const handleOpenEditSector = (sec: any) => {
    setEditingSector(sec);
    setEditSectorName(sec.name);
    setEditSectorColor(sec.colorHex || "#8B5CF6");
  };

  const handleSaveEditSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSector || !editSectorName.trim()) return;
    const res = await execTableAction(
      {
        action: "EDIT_SECTOR",
        sectorId: editingSector.id,
        sectorName: editSectorName.trim(),
        colorHex: editSectorColor,
      },
      `Sector "${editSectorName.trim()}" actualizado`
    );
    if (res) setEditingSector(null);
  };

  const handleOpenDeleteSector = (sec: any) => {
    setDeletingSector(sec);
    setDeleteSectorCascade(false);
  };

  const handleConfirmDeleteSector = async () => {
    if (!deletingSector) return;
    const res = await execTableAction(
      {
        action: "DELETE_SECTOR",
        sectorId: deletingSector.id,
        deleteTablesWithSector: deleteSectorCascade,
      },
      deleteSectorCascade
        ? `Sector "${deletingSector.name}" y sus mesas eliminados`
        : `Sector "${deletingSector.name}" eliminado (mesas reasignadas)`
    );
    if (res) {
      if (selectedSector === deletingSector.id) {
        setSelectedSector("ALL");
      }
      setDeletingSector(null);
    }
  };

  // Handlers para Mesas
  const handleOpenCreateTableModal = () => {
    const nextNum = Math.max(0, ...tables.map((t) => t.number || 0)) + 1;
    setCreateTableNumber(nextNum);
    setCreateTableLabel(`Mesa ${nextNum}`);
    setCreateTableCapacity(4);
    setCreateTableSectorId(selectedSector !== "ALL" ? selectedSector : sectors[0]?.id || "");
    setCreateTableZone("DJ");
    setIsCreateTableModalOpen(true);
  };

  const handleCreateModalTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await execTableAction(
      {
        action: "CREATE_TABLE",
        number: Number(createTableNumber),
        label: createTableLabel.trim() || `Mesa ${createTableNumber}`,
        capacity: Number(createTableCapacity),
        sectorId: createTableSectorId || undefined,
        zone: createTableZone,
      },
      `Mesa "${createTableLabel.trim() || `Mesa ${createTableNumber}`}" creada con QR único`
    );
    if (res) setIsCreateTableModalOpen(false);
  };

  const handleDeleteTable = (t: any) => {
    setDeletingTable(t);
  };

  const handleConfirmDeleteTable = async () => {
    if (!deletingTable) return;
    const res = await execTableAction(
      { action: "DELETE_TABLE", tableId: deletingTable.id },
      `Mesa "${deletingTable.label}" eliminada / desactivada`
    );
    if (res) {
      if (activeTableId === deletingTable.id) setActiveTableId(null);
      setDeletingTable(null);
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast("Enlace QR copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadQrPng = (table: any, useMenuOnly = false) => {
    const dataUrl = useMenuOnly ? table.menuQrDataUrl || table.qrDataUrl : table.qrDataUrl;
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `QR-${(table.label || `Mesa-${table.number}`).replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const handleResetDjSlot = async (table: any) => {
    try {
      const res = await fetch(`/api/v1/tables/${table.id}/reset-slot`, { method: "POST" });
      if (res.ok) {
        showToast(`Cupo musical (DJ/Karaoke) reiniciado para ${table.label}`);
      } else {
        showToast("Cupo musical listo");
      }
    } catch {
      showToast("Error al reiniciar cupo musical");
    }
  };

  const filteredTables = tables.filter(
    (t) => t.active !== false && (selectedSector === "ALL" || t.sectorId === selectedSector)
  );

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-medium">
          Cargando Centro Unificado de Mesas y Códigos QR...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb de Navegación */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard" className="hover:text-purple-300 transition-colors">
          Gestión del Local
        </Link>
        <span>&bull;</span>
        <span className="text-purple-300 font-semibold">
          Centro Unificado de Mesas, Sectores, Cuentas y Códigos QR
        </span>
      </div>

      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg">
          <span>✓ {toast}</span>
          <button onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Encabezado Unificado: Mesas, Sectores, Cuentas y Códigos QR */}
      <div className="p-6 rounded-3xl bg-[#0D1930] border border-[#263858] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-purple-400" />
              <span>Centro Unificado de Mesas, Sectores, Cuentas y Códigos QR</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
              Gestión del Local • Mesas & QR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Administrá en un solo lugar el plano de sectores, códigos QR imprimibles (Menú Digital + Música), cambio de mesa, unificación y división de cuentas.
          </p>
        </div>

        {/* Acciones Rápidas VIP: Nuevo Sector y Nueva Mesa */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateSectorModal}
            className="px-4 py-2.5 rounded-xl bg-[#080F1F] hover:bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>+ Nuevo Sector</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateTableModal}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-purple-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Mesa con QR</span>
          </button>
        </div>
      </div>

      {/* Filtro por Sectores + Gestión de Sectores */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedSector("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedSector === "ALL"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-[#0D1930] text-slate-300 border border-[#263858] hover:text-white"
            }`}
          >
            Todos los sectores ({tables.filter((t) => t.active !== false).length})
          </button>
          {sectors.map((sec) => {
            const countInSec = tables.filter(
              (t) => t.active !== false && t.sectorId === sec.id
            ).length;
            const isSecActive = selectedSector === sec.id;
            const sectorColor = sec.colorHex || "#8B5CF6";

            return (
              <div
                key={sec.id}
                className={`flex items-center gap-1 p-1 rounded-xl border transition-all ${
                  isSecActive
                    ? "bg-[#111F38] border-purple-500/60 shadow-sm"
                    : "bg-[#0D1930] border-[#263858] hover:border-slate-600"
                }`}
              >
                <button
                  onClick={() => setSelectedSector(sec.id)}
                  className="px-2.5 py-1 text-xs font-bold whitespace-nowrap transition flex items-center gap-2 text-slate-200 hover:text-white"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: sectorColor }}
                  />
                  <span>{sec.name}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] text-slate-300 font-mono">
                    {countInSec}
                  </span>
                </button>

                <div className="flex items-center gap-0.5 pl-1 border-l border-[#263858]">
                  <button
                    onClick={() => handleOpenEditSector(sec)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-950/30 transition-colors"
                    title={`Editar sector "${sec.name}"`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {sectors.length > 1 && (
                    <button
                      onClick={() => handleOpenDeleteSector(sec)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
                      title={`Eliminar sector "${sec.name}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleOpenCreateSectorModal}
            className="px-3 py-1.5 rounded-xl bg-[#080F1F] hover:bg-purple-950/30 border border-dashed border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Sector</span>
          </button>
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
              "Nueva mesa con QR único agregada al sector"
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
          <input
            type="number"
            min={1}
            max={30}
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg bg-[#080F1F] border border-[#263858] text-white w-16"
            title="Capacidad de personas"
          />
          <div className="w-48">
            <VipSelectModal
              value={newTableSectorId}
              onChange={(val) => setNewTableSectorId(val)}
              options={sectors.map((s) => ({
                value: s.id,
                label: s.name,
                badge: s.code || "SECTOR",
                icon: MapPin,
              }))}
              title="Sector de la Nueva Mesa"
              subtitle="Asigna a qué área del local pertenecerá"
              placeholder="Sector..."
              icon={MapPin}
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Mesa + QR</span>
          </button>
        </form>
      </div>

      {/* Grilla Visual de Mesas y Panel Lateral de Gestión */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {filteredTables.map((table) => {
            const st =
              GASTRO_TABLE_STATUS_LABELS[table.tableStatus] ||
              GASTRO_TABLE_STATUS_LABELS.AVAILABLE;
            const session = table.activeSession;
            const isSelected = activeTable?.id === table.id;

            return (
              <div
                key={table.id}
                onClick={() => {
                  setActiveTableId(table.id);
                  setSplitResult(null);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-purple-950/40 border-purple-400 ring-2 ring-purple-500/40"
                    : "bg-[#0D1930] border-[#263858] hover:border-slate-500"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                        {table.sector?.name || "Salón principal"}
                      </span>
                      <h3 className="text-base font-black text-white">{table.label}</h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${st.color}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> #{table.number} • {table.capacity} pers.
                    </span>
                    {session ? (
                      <span className="font-black text-emerald-300">
                        {formatGuaranies(session.totalCents)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">Sin consumo activo</span>
                    )}
                  </div>

                  {table.activeOrders && table.activeOrders.length > 0 && (
                    <div
                      className="mt-2.5 p-2 rounded-xl bg-[#080F1F] border border-amber-500/30 flex items-center justify-between text-[11px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-amber-300 font-bold">
                        {table.activeOrders.length} pedido{table.activeOrders.length > 1 ? "s" : ""} activo{table.activeOrders.length > 1 ? "s" : ""}
                      </span>
                      {table.activeOrders.some((o: any) => o.paymentStatus === "PENDING") ? (
                        <Link
                          href="/dashboard/gastronomy/cashier"
                          className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                        >
                          Cobrar en Caja →
                        </Link>
                      ) : (
                        <span className="text-emerald-300 font-bold text-[10px]">Pago Aprobado</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Botones rápidos de QR e Impresión en cada tarjeta */}
                <div
                  className="mt-3 pt-2.5 border-t border-[#1E2D4A] flex items-center justify-between gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setPrintingTable(table)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#080F1F] hover:bg-purple-950/50 border border-[#263858] text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1"
                    title="Imprimir plantilla QR para acrílico de mesa"
                  >
                    <Printer className="w-3 h-3 text-purple-400" />
                    <span>Imprimir QR</span>
                  </button>
                  <button
                    onClick={() => handleDownloadQrPng(table, false)}
                    className="p-1.5 rounded-lg bg-[#080F1F] hover:bg-slate-800 border border-[#263858] text-slate-300"
                    title="Descargar PNG del QR"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(table)}
                    className="p-1.5 rounded-lg bg-[#080F1F] hover:bg-slate-800 border border-[#263858] text-slate-300"
                    title="Editar mesa / Cambiar sector"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(table)}
                    className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                    title="Eliminar mesa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel Lateral de Control Integral de la Mesa Seleccionada */}
        <div className="p-5 rounded-3xl bg-[#0D1930] border border-[#263858] space-y-4 h-fit sticky top-20">
          {!activeTable ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Seleccioná una mesa del plano para administrar su código QR, estado, cambio de mesa, unificación, división de cuenta o pedidos musicales.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-300">
                    {activeTable.sector?.name || activeTable.zone || "Salón Principal"}
                  </span>
                  <h2 className="text-lg font-black text-white">{activeTable.label}</h2>
                  <span className="text-[10px] font-mono text-slate-400">
                    Token: {activeTable.qrToken}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(activeTable)}
                    className="p-2 rounded-xl bg-[#080F1F] hover:bg-slate-800 border border-[#263858] text-slate-200"
                    title="Editar mesa"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTable(activeTable)}
                    className="p-2 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 text-red-300"
                    title="Eliminar mesa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tarjeta QR Dual (Unificado Guest + Directo Menú Gastronómico) */}
              <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-purple-400" />
                    Código QR de la Mesa
                  </span>
                  <div className="flex rounded-lg bg-[#0D1930] p-0.5 border border-[#263858] text-[10px]">
                    <button
                      onClick={() => setQrMode("UNIFIED")}
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        qrMode === "UNIFIED" ? "bg-purple-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Todo en 1
                    </button>
                    <button
                      onClick={() => setQrMode("MENU_ONLY")}
                      className={`px-2 py-0.5 rounded-md font-bold ${
                        qrMode === "MENU_ONLY" ? "bg-emerald-600 text-white" : "text-slate-400"
                      }`}
                    >
                      Solo Menú
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {(qrMode === "UNIFIED" ? activeTable.qrDataUrl : activeTable.menuQrDataUrl) && (
                    <img
                      src={
                        qrMode === "UNIFIED"
                          ? activeTable.qrDataUrl
                          : activeTable.menuQrDataUrl || activeTable.qrDataUrl
                      }
                      alt={activeTable.label}
                      className="w-20 h-20 rounded-xl bg-white p-1 shrink-0"
                    />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {qrMode === "UNIFIED"
                        ? "Abre el portal de la mesa con Música DJ, Karaoke y pestaña 🍹 Menú Gastronómico."
                        : "Abre directamente el Menú Digital Gastronómico en la mesa."}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={
                          qrMode === "UNIFIED"
                            ? `/qr/${activeTable.qrToken}`
                            : `/menu?qrToken=${activeTable.qrToken}`
                        }
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold"
                      >
                        <span>Probar</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() =>
                          handleCopyUrl(
                            qrMode === "UNIFIED" ? activeTable.scanUrl : activeTable.menuUrl,
                            activeTable.id
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1930] hover:bg-slate-800 border border-[#263858] text-slate-200 text-[11px]"
                      >
                        {copiedId === activeTable.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copiar</span>
                      </button>
                      <button
                        onClick={() => setPrintingTable(activeTable)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1930] hover:bg-slate-800 border border-[#263858] text-slate-200 text-[11px]"
                      >
                        <Printer className="w-3 h-3 text-purple-400" />
                        <span>Acrílico</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cambiar Estado de la Mesa */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  Cambiar Estado de la Mesa
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    "AVAILABLE",
                    "OCCUPIED",
                    "RESERVED",
                    "PENDING_PAYMENT",
                    "CLEANING",
                    "BLOCKED",
                  ].map((stKey) => (
                    <button
                      key={stKey}
                      onClick={() =>
                        execTableAction(
                          {
                            action: "UPDATE_TABLE_STATUS",
                            tableId: activeTable.id,
                            tableStatus: stKey,
                          },
                          `Estado de ${activeTable.label} actualizado`
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-lg font-bold border text-left ${
                        activeTable.tableStatus === stKey
                          ? "bg-purple-600 text-white border-purple-400"
                          : "bg-[#080F1F] text-slate-300 border-[#263858]"
                      }`}
                    >
                      {GASTRO_TABLE_STATUS_LABELS[stKey]?.label || stKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transferir o Unificar Cuentas */}
              <div className="pt-3 border-t border-[#1E2D4A] space-y-2">
                <label className="block text-[11px] font-bold text-slate-300">
                  Cambiar de Mesa / Unificar Cuenta con otra Mesa
                </label>
                <VipSelectModal
                  value={targetTableId}
                  onChange={(val) => setTargetTableId(val)}
                  options={[
                    { value: "", label: "Seleccionar mesa destino...", subtitle: "Elige dónde transferir o unificar" },
                    ...tables
                      .filter((t) => t.id !== activeTable.id && t.active !== false)
                      .map((t) => ({
                        value: t.id,
                        label: t.label || `Mesa ${t.number}`,
                        subtitle: `Sector: ${t.sector?.name || "Salón"} • Capacidad: ${t.capacity || 4}p`,
                        badge: `#${t.number}`,
                        icon: MapPin,
                      })),
                  ]}
                  title="Mesa de Destino para Transferencia / Fusión"
                  subtitle={`Mesa origen actual: ${activeTable.label}`}
                  placeholder="Seleccionar mesa destino..."
                  icon={MapPin}
                  showSearch={tables.length > 5}
                />
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
                        `Cuenta transferida desde ${activeTable.label}`
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-200 hover:bg-blue-600/30 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Transferir</span>
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
                        `Cuentas unificadas exitosamente`
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-200 hover:bg-amber-600/30 disabled:opacity-40 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Unificar</span>
                  </button>
                </div>
              </div>

              {/* Dividir Cuenta entre Varios Clientes */}
              <div className="pt-3 border-t border-[#1E2D4A] space-y-2">
                <label className="block text-[11px] font-bold text-slate-300">
                  Dividir Cuenta entre Varios Clientes
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={splitParts}
                    onChange={(e) => setSplitParts(Number(e.target.value))}
                    className="w-20 px-3 py-1.5 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white"
                  />
                  <button
                    onClick={async () => {
                      const res = await execTableAction(
                        {
                          action: "SPLIT_TABLE_SESSION",
                          tableId: activeTable.id,
                          splitParts,
                        },
                        `Cuenta dividida en ${splitParts} partes`
                      );
                      if (res?.splitAccounts) {
                        setSplitResult(res.splitAccounts);
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Split className="w-3.5 h-3.5" />
                    <span>Dividir en {splitParts}</span>
                  </button>
                </div>
                {splitResult && (
                  <div className="p-2.5 rounded-xl bg-[#080F1F] border border-[#263858] space-y-1 text-xs">
                    {splitResult.map((s: any) => (
                      <div key={s.index} className="flex justify-between text-slate-300">
                        <span>{s.guestName}:</span>
                        <span className="font-bold text-emerald-300">
                          {formatGuaranies(s.amountCents)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acciones Musicales DJ / Karaoke de la Mesa */}
              <div className="pt-3 border-t border-[#1E2D4A] space-y-2">
                <label className="block text-[11px] font-bold text-slate-300">
                  Entretenimiento Musical (DJ / Karaoke)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMusicOrderTableId(activeTable.id)}
                    className="px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/30 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Pedir Canción</span>
                  </button>
                  <button
                    onClick={() => handleResetDjSlot(activeTable)}
                    className="px-3 py-2 rounded-xl bg-slate-800/60 border border-[#263858] text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Liberar Cupo DJ</span>
                  </button>
                </div>
              </div>

              {/* Cerrar Sesión de Consumo */}
              <div className="pt-3 border-t border-[#1E2D4A]">
                <button
                  onClick={() =>
                    execTableAction(
                      { action: "CLOSE_TABLE_SESSION", tableId: activeTable.id },
                      `Sesión de ${activeTable.label} cerrada y mesa liberada`
                    )
                  }
                  className="w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/30 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cerrar Cuenta y Liberar Mesa</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Edición de Mesa */}
      {editingTable && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditTable}
            className="w-full max-w-md rounded-3xl bg-[#0D1930] border border-[#263858] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                Editar {editingTable.label}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Número de Mesa</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editNumber}
                  onChange={(e) => setEditNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Capacidad (personas)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Nombre / Etiqueta</label>
              <input
                type="text"
                required
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Sector Gastronómico *</label>
              <VipSelectModal
                value={editSectorId}
                onChange={(val) => setEditSectorId(val)}
                options={sectors.map((s) => ({
                  value: s.id,
                  label: s.name,
                  badge: s.code || "SECTOR",
                  icon: MapPin,
                }))}
                title="Editar Sector Gastronómico"
                subtitle="Reubica esta mesa en otro sector o salón"
                placeholder="Sector..."
                icon={MapPin}
              />
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
              <input
                type="checkbox"
                checked={editRegenerateQr}
                onChange={(e) => setEditRegenerateQr(e.target.checked)}
                className="rounded text-amber-500"
              />
              <span className="text-xs text-amber-200">
                Regenerar código QR único (invalida el código impreso anterior)
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="px-4 py-2 rounded-xl bg-[#080F1F] text-xs text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Impresión de Plantilla QR para Acrílico de Mesa */}
      {printingTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white text-zinc-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 print:hidden">
              <h3 className="text-sm font-black text-zinc-900">
                Plantilla Imprimible para Mesa ({printingTable.label})
              </h3>
              <button
                onClick={() => setPrintingTable(null)}
                className="text-zinc-500 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 rounded-2xl border-2 border-zinc-900 text-center space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-widest text-purple-700">
                {printingTable.sector?.name || printingTable.zone || "SALÓN PRINCIPAL"}
              </div>
              <div className="text-3xl font-black text-zinc-950">{printingTable.label}</div>
              <div className="flex justify-center py-2">
                <img
                  src={printingTable.qrDataUrl}
                  alt={printingTable.label}
                  className="w-48 h-48 object-contain"
                />
              </div>
              <p className="text-xs font-bold text-zinc-800">
                📱 Escaneá el QR con tu cámara para ver el{" "}
                <span className="text-purple-700">Menú Digital (Bebidas y Comidas)</span> y pedir{" "}
                <span className="text-indigo-700">Música en Vivo / Karaoke</span>
              </p>
              <div className="text-[10px] font-mono text-zinc-500">
                VIDJSPRO • {printingTable.qrToken}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 print:hidden">
              <button
                onClick={() => handleDownloadQrPng(printingTable, false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-900 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Descargar PNG
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir Acrílico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Cargar Pedido Musical DJ/Karaoke a nombre de la Mesa */}
      {musicOrderTableId && activeEvent && (
        <ManualRequestModal
          isOpen={Boolean(musicOrderTableId)}
          onClose={() => setMusicOrderTableId(null)}
          eventId={activeEvent.id}
          tables={tables.map((t) => ({
            id: t.id,
            number: t.number,
            label: t.label,
            zone: t.sector?.name || t.zone,
          }))}
          initialTableId={musicOrderTableId}
          onSuccess={() => {
            setMusicOrderTableId(null);
            showToast("Pedido musical enviado a la Cabina DJ / Karaoke");
          }}
        />
      )}

      {/* MODAL VIP 1: CREAR NUEVO SECTOR */}
      {isCreateSectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSectorModalSubmit}
            className="w-full max-w-md rounded-3xl bg-[#0D1930] border border-[#263858] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Crear Nuevo Sector</h3>
                  <p className="text-[11px] text-slate-400">Salón, terraza, VIP, barra o patio</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSectorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Nombre del Sector *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Terraza Lounge, VIP Deck, Salón Oro"
                value={sectorNameInput}
                onChange={(e) => setSectorNameInput(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Código Corto (opcional)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="Ej: VIP, TER, SAL"
                value={sectorCodeInput}
                onChange={(e) => setSectorCodeInput(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                <span>Color Distintivo del Sector</span>
                <span className="text-[10px] font-mono text-purple-300">{sectorColorInput}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SECTOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSectorColorInput(c.hex)}
                    className={`p-2 rounded-xl border flex items-center gap-1.5 text-[11px] font-bold transition-all ${
                      sectorColorInput === c.hex
                        ? "bg-purple-950/80 border-purple-400 text-white shadow-sm ring-1 ring-purple-400"
                        : "bg-[#080F1F] border-[#263858] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="truncate text-[10px]">{c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#263858]">
              <button
                type="button"
                onClick={() => setIsCreateSectorModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#080F1F] text-xs text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/25 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Sector</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL VIP 2: EDITAR SECTOR */}
      {editingSector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditSector}
            className="w-full max-w-md rounded-3xl bg-[#0D1930] border border-[#263858] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Editar Sector</h3>
                  <p className="text-[11px] text-slate-400">{editingSector.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSector(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Nombre del Sector *
              </label>
              <input
                type="text"
                required
                value={editSectorName}
                onChange={(e) => setEditSectorName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                <span>Color Distintivo del Sector</span>
                <span className="text-[10px] font-mono text-purple-300">{editSectorColor}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {SECTOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setEditSectorColor(c.hex)}
                    className={`p-2 rounded-xl border flex items-center gap-1.5 text-[11px] font-bold transition-all ${
                      editSectorColor === c.hex
                        ? "bg-purple-950/80 border-purple-400 text-white shadow-sm ring-1 ring-purple-400"
                        : "bg-[#080F1F] border-[#263858] text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="truncate text-[10px]">{c.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#263858]">
              <button
                type="button"
                onClick={() => setEditingSector(null)}
                className="px-4 py-2 rounded-xl bg-[#080F1F] text-xs text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/25"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL VIP 3: ELIMINAR SECTOR */}
      {deletingSector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D1930] border border-red-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/40">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Eliminar Sector</h3>
                  <p className="text-[11px] text-red-300">{deletingSector.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingSector(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const sectorTablesCount = tables.filter(
                (t) => t.active !== false && t.sectorId === deletingSector.id
              ).length;

              return (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    Estás por eliminar el sector <strong className="text-white">"{deletingSector.name}"</strong>.
                  </p>

                  {sectorTablesCount > 0 ? (
                    <div className="p-3.5 rounded-2xl bg-[#080F1F] border border-[#263858] space-y-2.5">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <span>⚠️ Este sector contiene {sectorTablesCount} mesa(s) asociada(s):</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <label className="flex items-start gap-2.5 p-2 rounded-xl bg-navy-900/60 border border-purple-500/30 cursor-pointer">
                          <input
                            type="radio"
                            name="deleteSectorAction"
                            checked={!deleteSectorCascade}
                            onChange={() => setDeleteSectorCascade(false)}
                            className="mt-0.5 text-purple-600"
                          />
                          <div>
                            <span className="font-bold text-white block">Conservar las mesas</span>
                            <span className="text-[11px] text-slate-400 block">
                              Reasigna automáticamente las {sectorTablesCount} mesas al sector principal.
                            </span>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2 rounded-xl bg-red-950/20 border border-red-500/30 cursor-pointer">
                          <input
                            type="radio"
                            name="deleteSectorAction"
                            checked={deleteSectorCascade}
                            onChange={() => setDeleteSectorCascade(true)}
                            className="mt-0.5 text-red-500"
                          />
                          <div>
                            <span className="font-bold text-red-200 block">
                              Borrar también todas las mesas de este sector
                            </span>
                            <span className="text-[11px] text-red-300/80 block">
                              Elimina / desactiva las {sectorTablesCount} mesas asociadas al sector.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-[#263858] text-xs text-slate-400">
                      Este sector no tiene mesas asignadas actualmente.
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#263858]">
                    <button
                      type="button"
                      onClick={() => setDeletingSector(null)}
                      className="px-4 py-2 rounded-xl bg-[#080F1F] text-xs text-slate-300 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteSector}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/30 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmar Eliminación</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL VIP 4: CREAR NUEVA MESA */}
      {isCreateTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateModalTableSubmit}
            className="w-full max-w-md rounded-3xl bg-[#0D1930] border border-[#263858] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Nueva Mesa con QR Único</h3>
                  <p className="text-[11px] text-slate-400">Genera comensal, cuenta y código QR</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTableModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Número de Mesa *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={createTableNumber}
                  onChange={(e) => setCreateTableNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Capacidad (pers.)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={40}
                  value={createTableCapacity}
                  onChange={(e) => setCreateTableCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Nombre / Etiqueta de la Mesa *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Mesa 14, Box VIP 2, Living Pista"
                value={createTableLabel}
                onChange={(e) => setCreateTableLabel(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#080F1F] border border-[#263858] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Sector Gastronómico Asignado *
              </label>
              <VipSelectModal
                value={createTableSectorId}
                onChange={(val) => setCreateTableSectorId(val)}
                options={sectors.map((s) => ({
                  value: s.id,
                  label: s.name,
                  badge: s.code || "SECTOR",
                  icon: MapPin,
                }))}
                title="Sector de la Nueva Mesa"
                subtitle="Elige el salón o área del local donde se ubica"
                placeholder="Seleccionar Sector..."
                icon={MapPin}
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1">
                Modalidad Musical Predeterminada
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreateTableZone("DJ")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    createTableZone === "DJ"
                      ? "bg-amber-950/60 border-amber-500/60 text-amber-300 shadow-sm"
                      : "bg-[#080F1F] border-[#263858] text-slate-400 hover:text-white"
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Modo DJ / Pista</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateTableZone("KARAOKE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    createTableZone === "KARAOKE"
                      ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300 shadow-sm"
                      : "bg-[#080F1F] border-[#263858] text-slate-400 hover:text-white"
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>Modo Karaoke</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#263858]">
              <button
                type="button"
                onClick={() => setIsCreateTableModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#080F1F] text-xs text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/25 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Mesa + QR</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL VIP 5: ELIMINAR MESA */}
      {deletingTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D1930] border border-red-500/40 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#263858] pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/40">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Eliminar Mesa</h3>
                  <p className="text-[11px] text-red-300">{deletingTable.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingTable(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                ¿Confirmás que deseás eliminar <strong className="text-white">"{deletingTable.label}"</strong> (#{deletingTable.number}) del sector <strong className="text-purple-300">{deletingTable.sector?.name || "Salón Principal"}</strong>?
              </p>

              {deletingTable.activeSession || (deletingTable.activeOrders && deletingTable.activeOrders.length > 0) ? (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Mesa con consumos o pedidos asociados</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    Para proteger la trazabilidad contable y el cierre de caja, la mesa se desactivará de forma segura y se liberará su código QR.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-[#263858] text-xs text-slate-400">
                  La mesa no tiene pedidos activos. Se eliminará inmediatamente de la base de datos y del plano.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#263858]">
                <button
                  type="button"
                  onClick={() => setDeletingTable(null)}
                  className="px-4 py-2 rounded-xl bg-[#080F1F] text-xs text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTable}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-md shadow-red-600/30 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Mesa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
