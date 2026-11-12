"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  DoorOpen,
  Plus,
  Edit,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  Users,
  MapPin,
  Lock,
  Unlock,
  Loader2,
  X,
  ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { VipSelectModal } from "@/components/ui/VipSelectModal";
import { cn } from "@/lib/utils";

const SECTOR_TYPES = [
  { value: "MAIN", label: "Entrada Principal" },
  { value: "VIP", label: "Acceso VIP / Exclusivo" },
  { value: "PRESS", label: "Prensa & Medios" },
  { value: "BACKSTAGE", label: "Backstage / Escenario" },
  { value: "STAFF", label: "Funcionarios / Staff" },
  { value: "VENDOR", label: "Proveedores / Carga" },
  { value: "GENERAL", label: "General" },
];

export default function AccessPointsPage() {
  const { activeEvent, activeEventId, setCreateEventModalOpen } = useAccreditation();

  const [accessPoints, setAccessPoints] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<any | null>(null);

  const fetchAccessPoints = useCallback(async () => {
    if (!activeEventId) {
      setAccessPoints([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [resPoints, resCats] = await Promise.all([
        fetch(`/api/v1/accreditation/access-points?eventId=${activeEventId}`),
        fetch(`/api/v1/accreditation/types?eventId=${activeEventId}`),
      ]);

      if (resPoints.ok && resCats.ok) {
        const jsonPoints = await resPoints.json();
        const jsonCats = await resCats.json();
        setAccessPoints(jsonPoints.accessPoints || []);
        setCategories(jsonCats.types || []);
      }
    } catch (err) {
      console.error("Error loading access points:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    fetchAccessPoints();
  }, [fetchAccessPoints]);

  const handleToggleRule = async (
    pointId: string,
    catId: string,
    currentAllowed: boolean
  ) => {
    try {
      const res = await fetch(`/api/v1/accreditation/access-points/${pointId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: [{ accreditationTypeId: catId, allowed: !currentAllowed }],
        }),
      });

      if (res.ok) {
        setAccessPoints((prev) =>
          prev.map((pt) => {
            if (pt.id !== pointId) return pt;
            const updatedRules = pt.rules.map((r: any) =>
              r.accreditationTypeId === catId ? { ...r, isAllowed: !currentAllowed, allowed: !currentAllowed } : r
            );
            return { ...pt, rules: updatedRules };
          })
        );
      }
    } catch (err) {
      alert("Error al actualizar permiso");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el punto de acceso "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/accreditation/access-points/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al eliminar");
        return;
      }
      fetchAccessPoints();
    } catch (err) {
      alert("Error al comunicarse con el servidor");
    }
  };

  if (!activeEventId) {
    return (
      <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8 max-w-xl mx-auto">
        <DoorOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-2">Selecciona un Evento</h3>
        <p className="text-xs text-slate-400 mb-5">
          Debes seleccionar un evento activo para configurar sus puertas y sectores de acceso.
        </p>
        <Button
          variant="primary"
          onClick={() => setCreateEventModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
        >
          Crear Evento
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
              {activeEvent?.name}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-purple-400" />
            Puertas, Sectores & Matriz de Permisos
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configura puntos de ingreso físicos y define qué categorías están autorizadas por cada puerta
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingPoint(null);
            setModalOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Puerta de Acceso</span>
        </Button>
      </div>

      {/* Grid of Access Points with Permission Matrices */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
          Cargando puertas y accesos...
        </div>
      ) : accessPoints.length === 0 ? (
        <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8">
          <DoorOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Sin puertas configuradas</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            Crea accesos como Entrada Principal, VIP o Prensa para habilitar los escáneres en puerta.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setEditingPoint(null);
              setModalOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Crear Primera Puerta
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {accessPoints.map((pt) => {
            const ruleMap = new Map<string, boolean>();
            pt.rules.forEach((r: any) =>
              ruleMap.set(r.accreditationTypeId, r.isAllowed !== undefined ? r.isAllowed : r.allowed)
            );

            return (
              <div
                key={pt.id}
                className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#263858]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-400 shrink-0">
                      <DoorOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{pt.name}</h3>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          {pt.code}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                          {pt.sectorType}
                        </span>
                      </div>
                      {pt.locationDetails && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          {pt.locationDetails}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-slate-400 block text-[10px]">Ingresos Registrados</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        {pt._count?.checkInRecords || 0}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPoint(pt);
                          setModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pt.id, pt.name)}
                        className="p-1.5 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Category Access Permission Matrix */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                    Categorías Autorizadas para Ingresar por esta Puerta (Haz clic para alternar permiso)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {categories.map((cat) => {
                      const isAllowed = ruleMap.has(cat.id) ? ruleMap.get(cat.id)! : true;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleToggleRule(pt.id, cat.id, isAllowed)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left select-none",
                            isAllowed
                              ? "bg-[#0A1322] border-emerald-800/80 text-white hover:border-emerald-500 shadow-sm"
                              : "bg-[#0A1322]/40 border-red-950 text-slate-500 opacity-60 hover:opacity-100"
                          )}
                        >
                          <div className="flex items-center gap-2 truncate mr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.colorHex }}
                            />
                            <span className="truncate">{cat.name}</span>
                          </div>

                          {isAllowed ? (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1 shrink-0">
                              <Unlock className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-400 font-mono font-bold flex items-center gap-1 shrink-0">
                              <Lock className="w-3 h-3" /> NO
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Door Modal */}
      {modalOpen && (
        <AccessPointModal
          isOpen={modalOpen}
          initialData={editingPoint}
          eventId={activeEventId}
          categories={categories}
          onClose={() => {
            setModalOpen(false);
            setEditingPoint(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingPoint(null);
            fetchAccessPoints();
          }}
        />
      )}
    </div>
  );
}

function AccessPointModal({
  isOpen,
  initialData,
  eventId,
  categories,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialData: any | null;
  eventId: string;
  categories: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [locationDetails, setLocationDetails] = useState(initialData?.locationDetails || "");
  const [sectorType, setSectorType] = useState(initialData?.sectorType || "MAIN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!isEditing && !code.trim())) {
      setError("Nombre y código son obligatorios");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const endpoint = isEditing
        ? `/api/v1/accreditation/access-points/${initialData.id}`
        : "/api/v1/accreditation/access-points";
      const method = isEditing ? "PATCH" : "POST";

      const payload: any = {
        name: name.trim(),
        locationDetails: locationDetails.trim() || null,
        sectorType,
      };

      if (!isEditing) {
        payload.eventId = eventId;
        payload.code = code.trim().toUpperCase();
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar punto de acceso");
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al procesar");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-2xl text-[#F8FAFC]">
        <div className="flex items-center justify-between pb-4 border-b border-[#263858]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-300">
              <DoorOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? "Editar Puerta de Acceso" : "Nueva Puerta o Sector de Ingreso"}
              </h3>
              <p className="text-xs text-slate-400">
                Punto de control físico para validación de credenciales QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de la Puerta *
              </label>
              <Input
                type="text"
                placeholder="Ej: Entrada Principal, Acceso VIP"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEditing && !code) {
                    setCode(e.target.value.substring(0, 8).replace(/\s+/g, "_").toUpperCase());
                  }
                }}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código Único *
              </label>
              <Input
                type="text"
                placeholder="Ej: GATE_1, VIP_DOOR"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isEditing}
                required
                className="bg-[#0A1322] border-[#263858] text-white font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Sector
              </label>
              <VipSelectModal
                value={sectorType}
                onChange={(val) => setSectorType(val)}
                options={[
                  {
                    value: "MAIN",
                    label: "Entrada Principal",
                    subtitle: "Acceso general y público del evento",
                    badge: "GENERAL",
                    badgeTone: "bg-purple-500/20 text-purple-300 border-purple-500/40",
                    icon: DoorOpen,
                  },
                  {
                    value: "VIP",
                    label: "Acceso VIP / Exclusivo",
                    subtitle: "Sector preferencial o salones VIP",
                    badge: "VIP",
                    badgeTone: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                    icon: Shield,
                  },
                  {
                    value: "PRESS",
                    label: "Prensa & Medios",
                    subtitle: "Periodistas, fotógrafos y cronistas",
                    badge: "PRENSA",
                    badgeTone: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
                    icon: DoorOpen,
                  },
                  {
                    value: "BACKSTAGE",
                    label: "Backstage / Escenario",
                    subtitle: "Zona técnica, camerinos y producción",
                    badge: "ESCENARIO",
                    badgeTone: "bg-rose-500/20 text-rose-300 border-rose-500/40",
                    icon: Lock,
                  },
                  {
                    value: "STAFF",
                    label: "Funcionarios / Staff",
                    subtitle: "Personal operativo y colaboradores",
                    badge: "STAFF",
                    badgeTone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
                    icon: Users,
                  },
                  {
                    value: "VENDOR",
                    label: "Proveedores / Carga",
                    subtitle: "Montaje, sonido, catering y logística",
                    badge: "CARGA",
                    badgeTone: "bg-blue-500/20 text-blue-300 border-blue-500/40",
                    icon: DoorOpen,
                  },
                  {
                    value: "GENERAL",
                    label: "General / Otro Sector",
                    subtitle: "Puerta o molinete secundario",
                    badge: "OTRO",
                    badgeTone: "bg-zinc-800 text-zinc-300 border-zinc-700",
                    icon: DoorOpen,
                  },
                ]}
                title="Selecciona el Tipo de Sector"
                subtitle="Define la categoría de acceso de esta puerta o molinete"
                placeholder="Seleccionar tipo de sector..."
                icon={DoorOpen}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ubicación / Detalles
              </label>
              <Input
                type="text"
                placeholder="Ej: Acceso por calle Palma"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[#263858] text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                "Guardar Cambios"
              ) : (
                "Crear Puerta"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
