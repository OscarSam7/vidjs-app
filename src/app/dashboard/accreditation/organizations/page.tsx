"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Mail,
  Phone,
  FileText,
  Building,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export default function OrganizationsPage() {
  const { activeEvent, activeEventId, setCreateEventModalOpen } = useAccreditation();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!activeEventId) {
      setOrganizations([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`/api/v1/accreditation/organizations?eventId=${activeEventId}`);
      if (res.ok) {
        const json = await res.json();
        setOrganizations(json.organizations || []);
      }
    } catch (err) {
      console.error("Error loading organizations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la delegación "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/accreditation/organizations/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al eliminar");
        return;
      }
      fetchOrganizations();
    } catch (err) {
      alert("Error al comunicarse con el servidor");
    }
  };

  const filtered = organizations.filter((org) => {
    const q = searchTerm.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      (org.taxId && org.taxId.toLowerCase().includes(q)) ||
      (org.contactName && org.contactName.toLowerCase().includes(q))
    );
  });

  if (!activeEventId) {
    return (
      <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8 max-w-xl mx-auto">
        <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-2">Selecciona un Evento</h3>
        <p className="text-xs text-slate-400 mb-5">
          Debes seleccionar un evento activo para gestionar sus empresas y delegaciones.
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
            <Building2 className="w-5 h-5 text-purple-400" />
            Empresas, Instituciones & Delegaciones
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Agrupa participantes por entidad patrocinadora, delegación oficial o institución
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingOrg(null);
            setModalOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Delegación</span>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por empresa, RUC o persona de contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-[#0A1322] border-[#263858] text-white text-xs"
          />
        </div>
      </div>

      {/* Grid of Organizations */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
          Cargando delegaciones...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Sin delegaciones registradas</h3>
          <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
            {searchTerm
              ? "No se encontraron organizaciones para esta búsqueda."
              : "Registra empresas e instituciones para organizar y acreditar a sus representantes en bloque."}
          </p>
          <Button
            variant="primary"
            onClick={() => {
              setEditingOrg(null);
              setModalOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Crear Delegación
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((org) => {
            const currentCount = org._count?.participants || 0;
            const max = org.maxDelegates;
            const isFull = max && currentCount >= max;

            return (
              <div
                key={org.id}
                className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white line-clamp-1">{org.name}</h3>
                    {org.taxId && (
                      <span className="text-[11px] font-mono text-slate-400">
                        RUC / Doc: <strong className="text-slate-300">{org.taxId}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingOrg(org);
                        setModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(org.id, org.name)}
                      className="p-1.5 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-300 pt-2 border-t border-[#263858]/60">
                  {org.contactName && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>Contacto: <strong className="text-slate-200">{org.contactName}</strong></span>
                    </div>
                  )}
                  {org.email && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{org.email}</span>
                    </div>
                  )}
                  {org.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{org.phone}</span>
                    </div>
                  )}
                </div>

                {/* Cupo de delegados */}
                <div className="p-2.5 bg-[#0A1322] border border-[#263858] rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-400">Participantes asignados:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    <span className="text-purple-300">{currentCount}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-300">{max ? `${max} máx` : "Ilimitado"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <OrgModal
          isOpen={modalOpen}
          initialData={editingOrg}
          eventId={activeEventId}
          onClose={() => {
            setModalOpen(false);
            setEditingOrg(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingOrg(null);
            fetchOrganizations();
          }}
        />
      )}
    </div>
  );
}

function OrgModal({
  isOpen,
  initialData,
  eventId,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialData: any | null;
  eventId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name || "");
  const [taxId, setTaxId] = useState(initialData?.taxId || "");
  const [contactName, setContactName] = useState(initialData?.contactName || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [maxDelegates, setMaxDelegates] = useState(
    initialData?.maxDelegates ? String(initialData.maxDelegates) : ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la organización es obligatorio");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const endpoint = isEditing
        ? `/api/v1/accreditation/organizations/${initialData.id}`
        : "/api/v1/accreditation/organizations";
      const method = isEditing ? "PATCH" : "POST";

      const payload: any = {
        name: name.trim(),
        taxId: taxId.trim() || null,
        contactName: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        maxDelegates: maxDelegates ? parseInt(maxDelegates, 10) : null,
        notes: notes.trim() || null,
      };

      if (!isEditing) {
        payload.eventId = eventId;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar");
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al guardar");
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
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? "Editar Delegación" : "Nueva Empresa o Delegación"}
              </h3>
              <p className="text-xs text-slate-400">
                Registra entidad patrocinadora y cupo de representantes
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
                Nombre de la Empresa / Entidad *
              </label>
              <Input
                type="text"
                placeholder="Ej: Ministerio de Industria, Google Py"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                RUC / Identificador Fiscal
              </label>
              <Input
                type="text"
                placeholder="Ej: 80012345-6"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Persona de Contacto
              </label>
              <Input
                type="text"
                placeholder="Ej: Lic. María González"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cupo Máximo de Delegados
              </label>
              <Input
                type="number"
                placeholder="Vacío para ilimitado"
                min="1"
                value={maxDelegates}
                onChange={(e) => setMaxDelegates(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico
              </label>
              <Input
                type="email"
                placeholder="contacto@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teléfono / WhatsApp
              </label>
              <Input
                type="text"
                placeholder="+595 981 123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                "Crear Delegación"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
