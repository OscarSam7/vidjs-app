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
  Pencil,
  Trash2,
  AlertTriangle,
  Download,
  ShieldAlert,
  Layers,
  Power,
  Sliders,
  UserCheck,
  User,
  Headphones,
  Mic,
  Clock,
} from "lucide-react";
import ManualRequestModal from "@/components/dj/ManualRequestModal";
import { useRealtime } from "@/hooks/use-realtime";

export interface TableWithQr {
  id: string;
  number: number;
  label: string;
  qrToken: string;
  capacity: number;
  zone?: string;
  active: boolean;
  scanUrl: string;
  qrDataUrl: string;
  qrSvg: string;
  venue: {
    id: string;
    name: string;
  };
  occupancy?: {
    status: "LIBRE" | "OCUPADA_STAFF" | "OCUPADA_QR";
    staffName?: string | null;
    staffRole?: string | null;
    customerReference?: string | null;
    guestName?: string | null;
    assignedAt?: string | null;
    activeRequestsCount?: number;
  };
}

export default function TablesManagementPage() {
  const [tables, setTables] = useState<TableWithQr[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<string>("ALL");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Toast Notification State
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Modal para imprimir plantilla
  const [printingTable, setPrintingTable] = useState<TableWithQr | null>(null);

  // Modal para crear nueva mesa
  const [isNewTableOpen, setIsNewTableOpen] = useState(false);
  const [newVenueId, setNewVenueId] = useState("");
  const [newNumber, setNewNumber] = useState<number>(1);
  const [newLabel, setNewLabel] = useState("");
  const [newCapacity, setNewCapacity] = useState<number>(4);
  const [newZone, setNewZone] = useState<string>("MAIN");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal para editar mesa
  const [editingTable, setEditingTable] = useState<TableWithQr | null>(null);
  const [editVenueId, setEditVenueId] = useState("");
  const [editNumber, setEditNumber] = useState<number>(1);
  const [editLabel, setEditLabel] = useState("");
  const [editCapacity, setEditCapacity] = useState<number>(4);
  const [editZone, setEditZone] = useState<string>("MAIN");
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editRegenerateQr, setEditRegenerateQr] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal para eliminar mesa
  const [deletingTable, setDeletingTable] = useState<TableWithQr | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estados de Ocupación por Staff / DJ (Atención presencial / sin registro QR de cliente)
  const [occupyingTable, setOccupyingTable] = useState<TableWithQr | null>(null);
  const [staffMembers, setStaffMembers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [customStaffName, setCustomStaffName] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [isSavingOccupy, setIsSavingOccupy] = useState(false);
  const [filterOccupancy, setFilterOccupancy] = useState<"ALL" | "LIBRE" | "OCUPADA_STAFF" | "OCUPADA_QR">("ALL");

  // Estado para Cargar Pedidos Verbales directamente a nombre de la Mesa
  const [orderingTable, setOrderingTable] = useState<TableWithQr | null>(null);
  const [activeEvent, setActiveEvent] = useState<{ id: string; name: string; code: string; venueId?: string } | null>(null);

  const fetchStaffMembers = async () => {
    try {
      const res = await fetch("/api/v1/tables/staff-members");
      if (res.ok) {
        const json = await res.json();
        setStaffMembers(json.data || []);
      }
    } catch {}
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(data.data);
        if (data.activeEvent) {
          setActiveEvent(data.activeEvent);
        }
        if (data.data.length > 0 && !newVenueId) {
          setNewVenueId(data.data[0].venue.id);
        }
      }
    } catch (err) {
      console.error("Error al cargar mesas:", err);
      showToast("error", "Error de conexión al cargar la lista de mesas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchStaffMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronización en tiempo real vía Server-Sent Events (SSE)
  useRealtime({
    eventId: activeEvent?.id,
    onEvent: (type) => {
      if (
        type === "TABLE_OCCUPANCY_CHANGED" ||
        type === "TABLE_RELEASED" ||
        type === "QUEUE_UPDATE" ||
        type === "QUEUE_SLOT_UNLOCKED"
      ) {
        fetchTables();
      }
    },
  });

  const venues = Array.from(
    new Map(tables.map((t) => [t.venue.id, t.venue.name])).entries()
  );

  const venueTables = selectedVenue === "ALL" ? tables : tables.filter((t) => t.venue.id === selectedVenue);
  const totalCount = venueTables.length;
  const freeCount = venueTables.filter((t) => t.occupancy?.status === "LIBRE").length;
  const staffCount = venueTables.filter((t) => t.occupancy?.status === "OCUPADA_STAFF").length;
  const qrCount = venueTables.filter((t) => t.occupancy?.status === "OCUPADA_QR").length;

  const filteredTables = venueTables.filter((t) => {
    if (filterOccupancy === "LIBRE" && t.occupancy?.status !== "LIBRE") return false;
    if (filterOccupancy === "OCUPADA_STAFF" && t.occupancy?.status !== "OCUPADA_STAFF") return false;
    if (filterOccupancy === "OCUPADA_QR" && t.occupancy?.status !== "OCUPADA_QR") return false;
    return true;
  });

  // Abrir modal de asignación de DJ / Staff a una mesa
  const handleOpenOccupy = (table: TableWithQr) => {
    setOccupyingTable(table);
    setSelectedStaffName(table.occupancy?.staffName || staffMembers[0]?.name || "Cabina DJ");
    setCustomStaffName("");
    setCustomerReference(table.occupancy?.customerReference || "");
  };

  // Confirmar y guardar la asignación de la mesa al DJ o miembro del staff
  const handleConfirmOccupy = async () => {
    if (!occupyingTable) return;
    setIsSavingOccupy(true);
    try {
      const finalName = selectedStaffName === "custom" ? customStaffName.trim() : selectedStaffName;
      if (!finalName) {
        showToast("error", "Por favor ingresa o selecciona el nombre del staff o DJ");
        setIsSavingOccupy(false);
        return;
      }

      const res = await fetch(`/api/v1/tables/${occupyingTable.id}/occupy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "OCCUPY",
          staffName: finalName,
          customerReference: customerReference.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || `Mesa ${occupyingTable.label} asignada a ${finalName}`);
        setOccupyingTable(null);
        await fetchTables();
      } else {
        showToast("error", data.error?.message || "Error al asignar mesa");
      }
    } catch {
      showToast("error", "Error de red al asignar mesa");
    } finally {
      setIsSavingOccupy(false);
    }
  };

  // Liberar mesa atendida por staff o clientes
  const handleReleaseTableStaff = async (tableId: string, label: string) => {
    if (!confirm(`¿Confirmas desocupar y liberar la ${label}? Esto cancelará pedidos huérfanos pendientes y la dejará disponible.`)) return;
    setResettingId(tableId);
    try {
      const res = await fetch(`/api/v1/tables/${tableId}/occupy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RELEASE" }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || `Mesa ${label} liberada con éxito.`);
        if (occupyingTable?.id === tableId) setOccupyingTable(null);
        await fetchTables();
      } else {
        showToast("error", data.error?.message || "Error al liberar la mesa");
      }
    } catch {
      showToast("error", "Error de conexión al liberar la mesa");
    } finally {
      setResettingId(null);
    }
  };

  // Abrir modal de carga de pedido verbal para una mesa
  const handleOpenOrder = (table: TableWithQr) => {
    if (!activeEvent?.id) {
      showToast("error", "No hay una noche o evento activo para recibir pedidos. Inicia un evento en el panel.");
      return;
    }
    setOrderingTable(table);
  };

  const handleCopy = (url: string, token: string) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    showToast("info", "Enlace de mesa copiado al portapapeles");
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Descarga de imágenes QR
  const handleDownloadPng = (dataUrl: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-${fileName.replace(/\s+/g, "_")}.png`;
    a.click();
    showToast("success", `QR descargado en formato PNG`);
  };

  const handleDownloadSvg = (svgContent: string, fileName: string) => {
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-${fileName.replace(/\s+/g, "_")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("success", `QR vectorial descargado en formato SVG`);
  };

  // Crear Mesa
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
          zone: newZone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Error al crear la mesa");
      }

      setIsNewTableOpen(false);
      setNewLabel("");
      setNewNumber(tables.length + 1);
      showToast("success", `Mesa "${data.data?.label || newLabel}" creada con código QR exitosamente.`);
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

  // Abrir Modal de Edición
  const handleOpenEdit = (table: TableWithQr) => {
    setEditingTable(table);
    setEditVenueId(table.venue.id);
    setEditNumber(table.number);
    setEditLabel(table.label);
    setEditCapacity(table.capacity);
    setEditZone(table.zone || "MAIN");
    setEditActive(table.active);
    setEditRegenerateQr(false);
    setEditError(null);
  };

  // Guardar Edición
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/tables/${editingTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: editVenueId,
          number: editNumber,
          label: editLabel,
          capacity: editCapacity,
          zone: editZone,
          active: editActive,
          regenerateQr: editRegenerateQr,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Error al actualizar la mesa");
      }

      showToast("success", data.message || `Mesa "${editLabel}" actualizada con éxito.`);
      setEditingTable(null);
      await fetchTables();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditError(err.message);
      } else {
        setEditError("Error al guardar los cambios");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Abrir Modal de Eliminación
  const handleOpenDelete = (table: TableWithQr) => {
    setDeletingTable(table);
    setDeleteError(null);
  };

  // Confirmar Eliminación
  const handleDeleteTable = async () => {
    if (!deletingTable) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/v1/tables/${deletingTable.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Error al eliminar la mesa");
      }

      showToast("success", data.message || `Mesa eliminada correctamente.`);
      setDeletingTable(null);
      await fetchTables();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Error al eliminar la mesa");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Liberar / Resetear Mesa
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
        showToast("success", data.message || `Mesa ${label} liberada con éxito.`);
        await fetchTables();
      } else {
        showToast("error", data.error?.message || "Error al resetear la mesa");
      }
    } catch {
      showToast("error", "Error de conexión al resetear la mesa");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Toast Notification Bar */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-3 backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30"
              : toast.type === "error"
              ? "bg-red-950/90 border-red-500/50 text-red-200 shadow-red-900/30"
              : "bg-zinc-900/95 border-zinc-700 text-zinc-200 shadow-black/50"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header & Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              ACCESO MÓVIL CLIENTES
            </span>
            <span className="text-xs text-zinc-400">Total: {tables.length} mesas registradas</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Gestión de Mesas y Códigos QR
          </h1>
          <p className="text-xs text-zinc-400">
            Administra, edita, descarga e imprime los códigos QR seguros de cada mesa. Los clientes escanean para pedir música sin descargas.
          </p>
        </div>

        <button
          onClick={() => {
            setNewNumber(tables.length + 1);
            setNewLabel(`Mesa ${tables.length + 1}`);
            setNewZone("MAIN");
            setIsNewTableOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Mesa</span>
        </button>
      </div>

      {/* 2. Métricas de Ocupación en Tiempo Real y Filtros Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterOccupancy("ALL")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterOccupancy === "ALL"
              ? "bg-purple-950/40 border-purple-500/80 shadow-lg shadow-purple-950/50 ring-1 ring-purple-500/50"
              : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Total Mesas</span>
            <Building2 className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{totalCount}</div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Todas las configuradas</span>
        </button>

        <button
          onClick={() => setFilterOccupancy("LIBRE")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterOccupancy === "LIBRE"
              ? "bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50"
              : "bg-zinc-900/80 border-zinc-800 hover:border-emerald-600/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">Libres / Disponibles</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1.5">{freeCount}</div>
          <span className="text-[10px] text-emerald-400/70 mt-0.5 block">Listas para nuevos comensales</span>
        </button>

        <button
          onClick={() => setFilterOccupancy("OCUPADA_STAFF")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterOccupancy === "OCUPADA_STAFF"
              ? "bg-amber-950/50 border-amber-500/80 shadow-lg shadow-amber-950/50 ring-1 ring-amber-500/50"
              : "bg-zinc-900/80 border-zinc-800 hover:border-amber-600/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400">Atendidas DJ / Staff</span>
            <Headphones className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1.5">{staffCount}</div>
          <span className="text-[10px] text-amber-400/70 mt-0.5 block">Sin registro QR (verbales)</span>
        </button>

        <button
          onClick={() => setFilterOccupancy("OCUPADA_QR")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterOccupancy === "OCUPADA_QR"
              ? "bg-indigo-950/50 border-indigo-500/80 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50"
              : "bg-zinc-900/80 border-zinc-800 hover:border-indigo-600/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400">Clientes con QR</span>
            <UserCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300 mt-1.5">{qrCount}</div>
          <span className="text-[10px] text-indigo-400/70 mt-0.5 block">Escaneado desde su móvil</span>
        </button>
      </div>

      {/* 3. Filtro por Sede */}
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
              <span>
                {name} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Grilla de Mesas con Códigos QR */}
      {loading ? (
        <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xs">Cargando mesas y verificando códigos QR vectoriales...</span>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="p-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-3xl space-y-3">
          <QrCode className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">No hay mesas registradas en este local.</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Haz clic en &quot;Crear Nueva Mesa&quot; para registrar la primera y generar automáticamente su código QR.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className={`p-5 rounded-3xl bg-zinc-900/70 border transition-all flex flex-col justify-between space-y-4 shadow-lg group relative ${
                table.active
                  ? "border-zinc-800 hover:border-purple-600/40"
                  : "border-zinc-850 opacity-75 bg-zinc-950/60"
              }`}
            >
              <div>
                {/* Cabecera de la Tarjeta con Badges y Acciones Rápidas (Editar / Eliminar) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-purple-300 border border-zinc-700">
                        MESA #{table.number}
                      </span>

                      {/* Badge Activa / Inactiva */}
                      {table.active ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Activa
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Inactiva
                        </span>
                      )}

                      {/* Badge de Zona */}
                      {table.zone && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-750">
                          {table.zone === "MAIN"
                            ? "Principal"
                            : table.zone === "DJ"
                            ? "Zona DJ"
                            : table.zone === "KARAOKE"
                            ? "Karaoke"
                            : table.zone === "VIP"
                            ? "VIP / Box"
                            : table.zone === "TERRAZA"
                            ? "Terraza"
                            : table.zone}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white mt-1">{table.label}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{table.venue.name}</span>
                    </div>
                  </div>

                  {/* Acciones Superiores: Capacidad + Botones Editar / Eliminar */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 text-xs text-zinc-400 px-2 py-1 rounded-xl bg-zinc-950 border border-zinc-800" title="Capacidad en comensales">
                      <Users className="w-3 h-3 text-zinc-500" />
                      <span>{table.capacity}p</span>
                    </div>

                    {/* Botón Editar Mesa */}
                    <button
                      onClick={() => handleOpenEdit(table)}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-purple-950/60 text-zinc-400 hover:text-purple-300 border border-zinc-750 hover:border-purple-600/40 transition-colors cursor-pointer"
                      title="Editar mesa y opciones de QR"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Botón Eliminar Mesa */}
                    <button
                      onClick={() => handleOpenDelete(table)}
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 border border-zinc-750 hover:border-red-600/40 transition-colors cursor-pointer"
                      title="Eliminar mesa e invalidar su QR"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Banner de Estado de Ocupación */}
                {table.occupancy?.status === "OCUPADA_STAFF" ? (
                  <div className="mt-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-amber-300 truncate">
                          Staff: {table.occupancy.staffName}
                        </div>
                        {table.occupancy.customerReference ? (
                          <div className="text-[10px] text-zinc-400 truncate">
                            Ref: {table.occupancy.customerReference}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-400/70">Atención presencial / verbal</div>
                        )}
                      </div>
                    </div>
                    {typeof table.occupancy.activeRequestsCount === "number" && table.occupancy.activeRequestsCount > 0 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/40">
                        {table.occupancy.activeRequestsCount} pedidos
                      </span>
                    ) : null}
                  </div>
                ) : table.occupancy?.status === "OCUPADA_QR" ? (
                  <div className="mt-3 p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-purple-300 truncate">
                          Cliente QR: {table.occupancy.guestName || "Escaneado"}
                        </div>
                        <div className="text-[10px] text-purple-300/70">Pedido desde móvil</div>
                      </div>
                    </div>
                    {typeof table.occupancy.activeRequestsCount === "number" && table.occupancy.activeRequestsCount > 0 ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/40">
                        {table.occupancy.activeRequestsCount} pedidos
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-medium text-emerald-400">Mesa Libre / Disponible</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Sin pedidos activos</span>
                  </div>
                )}

                {/* Visualizador de QR con Marco Limpio */}
                <div className="mt-4 p-4 rounded-2xl bg-white flex items-center justify-center shadow-inner relative group/qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={table.qrDataUrl}
                    alt={`Código QR ${table.label}`}
                    className="w-36 h-36 object-contain transition-transform group-hover/qr:scale-105"
                  />
                  {!table.active && (
                    <div className="absolute inset-0 bg-zinc-950/80 rounded-2xl backdrop-blur-xs flex flex-col items-center justify-center text-center p-2 text-zinc-300">
                      <ShieldAlert className="w-6 h-6 text-amber-400 mb-1" />
                      <span className="text-[11px] font-bold text-white">QR Inactivo</span>
                      <span className="text-[9px] text-zinc-400">Escaneos bloqueados temporalmente</span>
                    </div>
                  )}
                </div>

                <div className="text-center mt-2">
                  <div className="text-[10px] font-mono text-zinc-500 truncate" title={table.scanUrl}>
                    {table.scanUrl}
                  </div>
                </div>
              </div>

              {/* Botones de Acción de la Mesa */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                {/* Asignación a Staff / DJ y Carga de Pedido Verbal */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOpenOccupy(table)}
                    className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      table.occupancy?.status === "OCUPADA_STAFF"
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40"
                        : "bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border-zinc-750 hover:border-zinc-700"
                    }`}
                    title="Enmarcar al DJ o staff para atender clientes sin QR"
                  >
                    <Headphones className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {table.occupancy?.status === "OCUPADA_STAFF" ? "Cambiar Staff" : "Asignar DJ/Staff"}
                    </span>
                  </button>

                  <button
                    onClick={() => handleOpenOrder(table)}
                    className="p-2 rounded-xl bg-gradient-to-r from-pink-600/25 to-purple-600/25 hover:from-pink-600/35 hover:to-purple-600/35 border border-pink-500/40 text-pink-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    title="Cargar pedido verbal directamente a nombre de esta mesa"
                  >
                    <Mic className="w-3.5 h-3.5 text-pink-400" />
                    <span>Cargar Pedido</span>
                  </button>
                </div>

                {/* Si está ocupada por Staff, botón para desocupar directamente */}
                {table.occupancy?.status === "OCUPADA_STAFF" && (
                  <button
                    onClick={() => handleReleaseTableStaff(table.id, table.label)}
                    disabled={resettingId === table.id}
                    className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] text-amber-300 hover:text-amber-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {resettingId === table.id ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Desocupando mesa...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Desocupar Mesa (Liberar Staff)</span>
                      </>
                    )}
                  </button>
                )}
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

                {/* Fila con Descargas Rápidas de QR */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDownloadPng(table.qrDataUrl, `${table.venue.name}-${table.label}`)}
                    className="py-1.5 px-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Descargar imagen PNG de alta definición para imprenta o diseño"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Descargar PNG</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSvg(table.qrSvg, `${table.venue.name}-${table.label}`)}
                    className="py-1.5 px-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Descargar vector SVG escalable sin pérdida de calidad"
                  >
                    <Download className="w-3 h-3 text-purple-400" />
                    <span>Descargar SVG</span>
                  </button>
                </div>

                {/* Copiar enlace */}
                <button
                  onClick={() => handleCopy(table.scanUrl, table.qrToken)}
                  className="w-full py-1.5 px-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedToken === table.qrToken ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">¡Enlace Copiado!</span>
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
                  className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] text-amber-300 hover:text-amber-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
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
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
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
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formError}</span>
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Capacidad (Personas)</label>
                  <input
                    type="number"
                    min={1}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Zona del Local</label>
                <select
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="MAIN">Zona Principal / Salón General</option>
                  <option value="DJ">Cerca a Cabina DJ</option>
                  <option value="KARAOKE">Zona Karaoke</option>
                  <option value="VIP">Box VIP / Reservados</option>
                  <option value="TERRAZA">Terraza / Exteriores</option>
                </select>
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
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-600/20"
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

      {/* 6. Modal de Edición de Mesa & Opciones de QR */}
      {editingTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Editar {editingTable.label} (#{editingTable.number})
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Modifica los parámetros de la mesa y gestiona su código QR
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTable(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-2xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Local / Sede *</label>
                <select
                  value={editVenueId}
                  onChange={(e) => setEditVenueId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  {venues.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Número de Mesa *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editNumber}
                    onChange={(e) => setEditNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Capacidad (Personas) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Etiqueta / Nombre Visible *</label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Ej: Mesa 12 (Terraza) / Box VIP A"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Zona del Local</label>
                  <select
                    value={editZone}
                    onChange={(e) => setEditZone(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="MAIN">Zona Principal / General</option>
                    <option value="DJ">Cerca a Cabina DJ</option>
                    <option value="KARAOKE">Zona Karaoke</option>
                    <option value="VIP">Box VIP / Reservados</option>
                    <option value="TERRAZA">Terraza / Exteriores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Estado de la Mesa</label>
                  <select
                    value={editActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(e) => setEditActive(e.target.value === "ACTIVE")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ACTIVE">🟢 Activa (Permite escaneos y pedidos)</option>
                    <option value="INACTIVE">🔴 Inactiva (En mantenimiento / Bloqueada)</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN ESPECIAL: GESTIÓN DE CÓDIGO QR Y REGENERACIÓN */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-white text-xs">Seguridad del Código QR</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[140px]" title={editingTable.qrToken}>
                    Token: {editingTable.qrToken}
                  </span>
                </div>

                <label className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={editRegenerateQr}
                    onChange={(e) => setEditRegenerateQr(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-purple-500 rounded cursor-pointer shrink-0"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      Regenerar nuevo Código QR (Rotación de seguridad)
                    </span>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Genera una clave criptográfica completamente nueva. <strong>Invalida de inmediato el QR impreso anterior</strong> y cierra sesiones huérfanas. Útil si el QR fue fotografiado y se comparten pedidos no autorizados desde fuera del local.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-purple-600/25 flex items-center justify-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando Cambios...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal de Confirmación de Eliminación de Mesa */}
      {deletingTable && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-red-900/60 rounded-3xl p-6 space-y-4 shadow-2xl shadow-red-950/40">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">¿Eliminar Mesa y QR?</h3>
                <p className="text-xs text-zinc-400">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-2xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs text-zinc-300">
              <p>
                Estás a punto de eliminar permanentemente la mesa{" "}
                <strong className="text-white">
                  &quot;{deletingTable.label}&quot; (Mesa #{deletingTable.number})
                </strong>{" "}
                del local <strong className="text-white">{deletingTable.venue.name}</strong>.
              </p>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2 text-[11px]">
                <div className="flex items-start gap-2 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>El código QR se invalidará inmediatamente:</strong> Si algún cliente escanea el QR físico impreso en la mesa, verá un mensaje informando que la mesa ya no existe.
                  </span>
                </div>
                <div className="flex items-start gap-2 text-zinc-400">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-500" />
                  <span>
                    Se cancelarán pedidos huérfanos pendientes o aceptados vinculados a esta mesa.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleDeleteTable}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando mesa y QR...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Eliminar Mesa y QR</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDeletingTable(null)}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal de Asignación de Mesa a DJ / Staff */}
      {occupyingTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Enmarcar Mesa: {occupyingTable.label}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Asignar al DJ o staff cuando los clientes no se registran por QR
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOccupyingTable(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Esta opción marca la mesa como ocupada físicamente y permite que el staff o DJ tome y cargue pedidos verbales directamente a su cuenta.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Atendido por (DJ / Miembro del Staff) *
                </label>
                <select
                  value={selectedStaffName}
                  onChange={(e) => setSelectedStaffName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Cabina DJ">🎧 Cabina DJ (General)</option>
                  <option value="Barra / Mozo">🍹 Barra / Mozo de Turno</option>
                  {staffMembers.map((member) => (
                    <option key={member.id} value={member.name}>
                      👤 {member.name} ({member.role})
                    </option>
                  ))}
                  <option value="custom">✏️ Otro / Ingresar nombre manualmente...</option>
                </select>
              </div>

              {selectedStaffName === "custom" && (
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Nombre o Apodo del Responsable *
                  </label>
                  <input
                    type="text"
                    required
                    value={customStaffName}
                    onChange={(e) => setCustomStaffName(e.target.value)}
                    placeholder="Ej: Mozo Lucas / DJ Residente / Barra VIP"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Referencia o Descripción de los Clientes (Opcional)
                </label>
                <input
                  type="text"
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                  placeholder="Ej: Grupo cumpleaños remeras negras / Pareja junto a la ventana"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Ayuda a identificar la mesa al entregar o reproducir pedidos.
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleConfirmOccupy}
                  disabled={isSavingOccupy}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2"
                >
                  {isSavingOccupy ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando asignación...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Confirmar y Enmarcar Mesa</span>
                    </>
                  )}
                </button>

                {occupyingTable.occupancy?.status === "OCUPADA_STAFF" && (
                  <button
                    type="button"
                    onClick={() => handleReleaseTableStaff(occupyingTable.id, occupyingTable.label)}
                    disabled={isSavingOccupy}
                    className="w-full py-2 bg-zinc-800 hover:bg-red-950/40 text-red-300 border border-zinc-700 hover:border-red-600/40 rounded-xl font-bold transition-colors cursor-pointer"
                  >
                    Desocupar / Liberar Mesa
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOccupyingTable(null)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal de Carga de Pedido Verbal para la Mesa */}
      {orderingTable && (
        <ManualRequestModal
          isOpen={!!orderingTable}
          onClose={() => setOrderingTable(null)}
          eventId={activeEvent?.id || ""}
          tables={tables.map((t) => ({
            id: t.id,
            number: t.number,
            label: t.label,
            zone: t.zone,
          }))}
          initialTableId={orderingTable.id}
          onSuccess={() => {
            showToast("success", `Pedido cargado exitosamente para ${orderingTable.label}`);
            setOrderingTable(null);
            fetchTables();
          }}
        />
      )}
    </div>
  );
}
