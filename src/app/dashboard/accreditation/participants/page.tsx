"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAccreditation } from "@/lib/accreditation/context";
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  QrCode,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Edit,
  Trash2,
  ExternalLink,
  Sparkles,
  Building,
  Mail,
  Phone,
  FileSpreadsheet,
  X,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export default function ParticipantsPage() {
  const { activeEvent, activeEventId, setCreateEventModalOpen } = useAccreditation();

  const [participants, setParticipants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedOrg, setSelectedOrg] = useState("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<any | null>(null);
  const [qrModalParticipant, setQrModalParticipant] = useState<any | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [isSendingAllEmails, setIsSendingAllEmails] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Categories & Organizations
  useEffect(() => {
    if (!activeEventId) return;

    fetch(`/api/v1/accreditation/types?eventId=${activeEventId}`)
      .then((res) => res.json())
      .then((d) => setCategories(d.types || []))
      .catch(console.error);

    fetch(`/api/v1/accreditation/organizations?eventId=${activeEventId}`)
      .then((res) => res.json())
      .then((d) => setOrganizations(d.organizations || []))
      .catch(console.error);
  }, [activeEventId]);

  // Load Participants
  const fetchParticipants = useCallback(async () => {
    if (!activeEventId) {
      setParticipants([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        eventId: activeEventId,
        page: String(page),
        limit: "50",
      });
      if (searchTerm) params.set("search", searchTerm);
      if (selectedType !== "ALL") params.set("typeId", selectedType);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (selectedOrg !== "ALL") params.set("orgId", selectedOrg);

      const res = await fetch(`/api/v1/accreditation/participants?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setParticipants(json.participants || []);
        if (json.pagination) {
          setPagination({
            total: json.pagination.total,
            totalPages: json.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      console.error("Error loading participants:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeEventId, page, searchTerm, selectedType, selectedStatus, selectedOrg]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Quick Status Toggle (Acreditar / Desacreditar)
  const handleQuickStatusChange = async (participantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACCREDITED" ? "APPROVED" : "ACCREDITED";
    try {
      const res = await fetch(`/api/v1/accreditation/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participantId
              ? {
                  ...p,
                  accreditation: p.accreditation
                    ? { ...p.accreditation, status: nextStatus }
                    : null,
                }
              : p
          )
        );
      }
    } catch (err) {
      alert("Error al actualizar estado");
    }
  };

  // Delete participant
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${name}? Se cancelará también su código QR.`)) return;

    try {
      const res = await fetch(`/api/v1/accreditation/participants/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al eliminar");
        return;
      }
      fetchParticipants();
    } catch (err) {
      alert("Error al comunicarse con el servidor");
    }
  };

  // Enviar credencial QR por correo electrónico individual
  const handleSendEmail = async (participantId: string, email: string) => {
    if (!activeEventId) return;
    setSendingEmailId(participantId);
    setEmailStatusMsg(null);
    try {
      const res = await fetch("/api/v1/accreditation/badges/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: activeEventId,
          participantIds: [participantId],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatusMsg({ type: "error", text: data.message || "Error al despachar correo" });
      } else {
        setEmailStatusMsg({ type: "success", text: `Credencial enviada con éxito a ${email}` });
      }
    } catch {
      setEmailStatusMsg({ type: "error", text: "Error de red al despachar correo" });
    } finally {
      setSendingEmailId(null);
    }
  };

  // Enviar credenciales QR masivas por correo electrónico
  const handleSendAllEmails = async () => {
    if (!activeEventId) return;
    const withEmail = participants.filter((p) => p.email && p.email.includes("@"));
    if (withEmail.length === 0) {
      alert("No hay participantes con dirección de correo electrónico en la lista");
      return;
    }
    if (!confirm(`¿Deseas enviar las credenciales QR por correo electrónico a ${withEmail.length} participantes?`)) return;

    setIsSendingAllEmails(true);
    setEmailStatusMsg(null);
    try {
      const res = await fetch("/api/v1/accreditation/badges/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: activeEventId,
          participantIds: withEmail.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatusMsg({ type: "error", text: data.message || "Error al despachar lote" });
      } else {
        setEmailStatusMsg({ type: "success", text: data.message });
      }
    } catch {
      setEmailStatusMsg({ type: "error", text: "Error de red al despachar lote de correos" });
    } finally {
      setIsSendingAllEmails(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (participants.length === 0) return;

    const headers = [
      "ID",
      "Nombre",
      "Apellido",
      "Documento",
      "TipoDoc",
      "Email",
      "Empresa",
      "Cargo",
      "Telefono",
      "Categoria",
      "CodigoCredencial",
      "Estado",
      "Ingresos",
    ];

    const rows = participants.map((p) => [
      p.id,
      `"${p.firstName}"`,
      `"${p.lastName}"`,
      `"${p.documentNumber}"`,
      p.documentType,
      `"${p.email}"`,
      `"${p.company || ""}"`,
      `"${p.jobTitle || ""}"`,
      `"${p.phone || ""}"`,
      `"${p.accreditationType?.name || ""}"`,
      `"${p.accreditation?.codeNumber || ""}"`,
      p.accreditation?.status || "APPROVED",
      p.accreditation?.totalCheckIns || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `participantes_${activeEvent?.code || "evento"}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeEventId) {
    return (
      <div className="py-16 text-center bg-[#0F1E36] border border-[#263858] rounded-2xl p-8 max-w-xl mx-auto">
        <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-2">Selecciona un Evento</h3>
        <p className="text-xs text-slate-400 mb-5">
          Debes seleccionar un evento activo para registrar o consultar participantes y credenciales.
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
            <Users className="w-5 h-5 text-purple-400" />
            Registro & Padrón de Participantes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {pagination.total} participantes registrados con credenciales digitales y códigos QR únicos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendAllEmails}
            disabled={isSendingAllEmails || participants.length === 0}
            className="border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-200 text-xs flex items-center gap-1.5"
            title="Enviar credenciales QR por correo a todos los participantes con email registrado"
          >
            {isSendingAllEmails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            <span>{isSendingAllEmails ? "Despachando..." : "Enviar QRs por Email"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={participants.length === 0}
            className="border-[#263858] text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="border-[#263858] text-purple-300 hover:text-purple-200 text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar Excel/CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingParticipant(null);
              setIsRegisterModalOpen(true);
            }}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Participante</span>
          </Button>
        </div>
      </div>

      {/* Email Status Alert */}
      {emailStatusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            emailStatusMsg.type === "success"
              ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-200"
              : "bg-red-950/60 border-red-700/80 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {emailStatusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{emailStatusMsg.text}</span>
          </div>
          <button
            onClick={() => setEmailStatusMsg(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#0F1E36] border border-[#263858] rounded-xl p-3.5 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre, apellido, cédula, email o empresa..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-[#0A1322] border-[#263858] text-white text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="APPROVED">Aprobado</option>
            <option value="ACCREDITED">Acreditado (Con Credencial)</option>
            <option value="CHECKED_IN">Ingresado en Sala</option>
            <option value="PENDING">Pendiente</option>
            <option value="BLOCKED">Bloqueado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          {/* Organization Filter */}
          {organizations.length > 0 && (
            <select
              value={selectedOrg}
              onChange={(e) => {
                setSelectedOrg(e.target.value);
                setPage(1);
              }}
              className="bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas las Empresas</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
            Cargando participantes...
          </div>
        ) : participants.length === 0 ? (
          <div className="py-16 text-center p-8">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No hay participantes registrados</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
              {searchTerm || selectedType !== "ALL" || selectedStatus !== "ALL"
                ? "No se encontraron coincidencias para los filtros aplicados."
                : "Comienza registrando participantes individualmente o importando una lista desde Excel."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="border-[#263858] text-xs text-purple-300"
              >
                Importar CSV
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setEditingParticipant(null);
                  setIsRegisterModalOpen(true);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
              >
                Registrar Participante
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0A1322] text-slate-400 border-b border-[#263858] text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Participante</th>
                  <th className="py-3 px-3">Documento</th>
                  <th className="py-3 px-3">Empresa / Cargo</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Código & QR</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-center">Ingresos</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263858]/50">
                {participants.map((p) => {
                  const acc = p.accreditation;
                  const cat = p.accreditationType;
                  const isAccredited = acc?.status === "ACCREDITED" || acc?.status === "CHECKED_IN";

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0 overflow-hidden">
                            {p.photoUrl ? (
                              <img src={p.photoUrl} alt={p.firstName} className="w-full h-full object-cover" />
                            ) : (
                              p.firstName[0]
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">
                                {p.firstName} {p.lastName}
                              </span>
                              {p.isSpecialGuest && (
                                <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                                  VIP Guest
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block">{p.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Document */}
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 mr-1">{p.documentType}:</span>
                        {p.documentNumber}
                      </td>

                      {/* Company & Job */}
                      <td className="py-3 px-3 text-slate-300">
                        <span className="block font-medium line-clamp-1">
                          {p.company || p.organization?.name || "-"}
                        </span>
                        {p.jobTitle && (
                          <span className="text-[10px] text-slate-400 block line-clamp-1">
                            {p.jobTitle}
                          </span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {cat ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${cat.colorHex}22`,
                              color: cat.colorHex,
                              border: `1px solid ${cat.colorHex}44`,
                            }}
                          >
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Code & QR View */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        {acc?.codeNumber ? (
                          <button
                            onClick={() => setQrModalParticipant(p)}
                            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors group cursor-pointer"
                            title="Ver credencial y código QR"
                          >
                            <QrCode className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span className="underline font-bold text-[11px]">{acc.codeNumber}</span>
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Sin QR</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <button
                          onClick={() => handleQuickStatusChange(p.id, acc?.status || "APPROVED")}
                          className="cursor-pointer"
                          title="Click para alternar acreditación entregada"
                        >
                          {acc?.status === "ACCREDITED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                              <CheckCircle2 className="w-3 h-3" /> Acreditado
                            </span>
                          ) : acc?.status === "CHECKED_IN" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              <Check className="w-3 h-3" /> En Sala
                            </span>
                          ) : acc?.status === "APPROVED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                              Aprobado
                            </span>
                          ) : acc?.status === "BLOCKED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                              <Ban className="w-3 h-3" /> Bloqueado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                              {acc?.status || "PENDIENTE"}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Check-ins count */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                        {acc?.totalCheckIns || 0}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendEmail(p.id, p.email)}
                            disabled={!p.email || sendingEmailId === p.id}
                            className={`p-1.5 ${
                              p.email
                                ? "text-slate-400 hover:text-emerald-400"
                                : "text-slate-600 cursor-not-allowed opacity-40"
                            }`}
                            title={
                              p.email
                                ? `Enviar credencial con QR por correo a ${p.email}`
                                : "Sin correo electrónico registrado"
                            }
                          >
                            {sendingEmailId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQrModalParticipant(p)}
                            className="p-1.5 text-slate-400 hover:text-purple-300"
                            title="Ver Credencial & QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingParticipant(p);
                              setIsRegisterModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white"
                            title="Editar datos"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(p.id, `${p.firstName} ${p.lastName}`)}
                            className="p-1.5 text-slate-400 hover:text-red-400"
                            title="Eliminar participante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3 bg-[#0A1322] border-t border-[#263858] flex items-center justify-between text-xs text-slate-400">
            <span>
              Página {page} de {pagination.totalPages} ({pagination.total} en total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-[#263858] text-xs"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="border-[#263858] text-xs"
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Participant Single Register / Edit Modal */}
      {isRegisterModalOpen && (
        <ParticipantFormModal
          isOpen={isRegisterModalOpen}
          initialData={editingParticipant}
          eventId={activeEventId}
          categories={categories}
          organizations={organizations}
          onClose={() => {
            setIsRegisterModalOpen(false);
            setEditingParticipant(null);
          }}
          onSaved={() => {
            setIsRegisterModalOpen(false);
            setEditingParticipant(null);
            fetchParticipants();
          }}
        />
      )}

      {/* QR Badge Inspection Modal */}
      {qrModalParticipant && (
        <QrInspectionModal
          participant={qrModalParticipant}
          isOpen={Boolean(qrModalParticipant)}
          onClose={() => setQrModalParticipant(null)}
        />
      )}

      {/* Bulk CSV / Excel Import Modal */}
      {isImportModalOpen && (
        <ImportCsvModal
          isOpen={isImportModalOpen}
          eventId={activeEventId}
          categories={categories}
          onClose={() => setIsImportModalOpen(false)}
          onImported={() => {
            setIsImportModalOpen(false);
            fetchParticipants();
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// Modals
// ----------------------------------------------------

function ParticipantFormModal({
  isOpen,
  initialData,
  eventId,
  categories,
  organizations,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialData: any | null;
  eventId: string;
  categories: any[];
  organizations: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = Boolean(initialData?.id);
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber || "");
  const [documentType, setDocumentType] = useState(initialData?.documentType || "CI");
  const [email, setEmail] = useState(initialData?.email || "");
  const [company, setCompany] = useState(initialData?.company || "");
  const [jobTitle, setJobTitle] = useState(initialData?.jobTitle || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || "");
  const [country, setCountry] = useState(initialData?.country || "Paraguay");
  const [city, setCity] = useState(initialData?.city || "");
  const [photoUrl, setPhotoUrl] = useState(initialData?.photoUrl || "");
  const [accreditationTypeId, setAccreditationTypeId] = useState(
    initialData?.accreditationTypeId || (categories[0]?.id ?? "")
  );
  const [organizationId, setOrganizationId] = useState(initialData?.organizationId || "");
  const [isSpecialGuest, setIsSpecialGuest] = useState(initialData?.isSpecialGuest || false);
  const [status, setStatus] = useState(initialData?.accreditation?.status || "APPROVED");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !documentNumber.trim() || !email.trim()) {
      setError("Nombre, apellido, documento y correo son obligatorios");
      return;
    }
    if (!accreditationTypeId) {
      setError("Debes seleccionar una categoría de acreditación");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const endpoint = isEditing
        ? `/api/v1/accreditation/participants/${initialData.id}`
        : "/api/v1/accreditation/participants";
      const method = isEditing ? "PATCH" : "POST";

      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentNumber: documentNumber.trim(),
        documentType,
        email: email.trim().toLowerCase(),
        company: company.trim() || null,
        jobTitle: jobTitle.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        country: country.trim() || "Paraguay",
        city: city.trim() || null,
        photoUrl: photoUrl.trim() || null,
        accreditationTypeId,
        organizationId: organizationId || null,
        isSpecialGuest,
        status,
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
        throw new Error(data.message || "Error al registrar participante");
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-2xl text-[#F8FAFC] my-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#263858]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-300">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? "Editar Participante" : "Registrar Participante & Emitir QR"}
              </h3>
              <p className="text-xs text-slate-400">
                Se generará código de acceso criptográfico irrepetible
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
                Nombres *
              </label>
              <Input
                type="text"
                placeholder="Ej: Juan Carlos"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Apellidos *
              </label>
              <Input
                type="text"
                placeholder="Ej: Pérez Duarte"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo Documento
              </label>
              <Select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                options={[
                  { value: "CI", label: "Cédula de Identidad (CI)" },
                  { value: "PASSPORT", label: "Pasaporte" },
                  { value: "DNI", label: "DNI" },
                  { value: "RUC", label: "RUC" },
                ]}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Número de Documento * (Antifraude)
              </label>
              <Input
                type="text"
                placeholder="Ej: 4567890"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
                className="bg-[#0A1322] border-[#263858] text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Correo Electrónico *
              </label>
              <Input
                type="email"
                placeholder="participante@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Teléfono / WhatsApp
              </label>
              <Input
                type="text"
                placeholder="+595 981 000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Empresa o Institución
              </label>
              <Input
                type="text"
                placeholder="Ej: Soluciones Digitales S.A."
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cargo / Rol
              </label>
              <Input
                type="text"
                placeholder="Ej: Director de Tecnología"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>
          </div>

          {/* Categoría & Delegación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Acreditación *
              </label>
              <select
                value={accreditationTypeId}
                onChange={(e) => setAccreditationTypeId(e.target.value)}
                required
                className="w-full bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Delegación Oficial (Opcional)
              </label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">Ninguna (Individual)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Special Guest */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Estado de Acreditación
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: "APPROVED", label: "Aprobado (Listo para emitir)" },
                  { value: "ACCREDITED", label: "Acreditado (Credencial entregada)" },
                  { value: "PENDING", label: "Pendiente de aprobación" },
                  { value: "BLOCKED", label: "Bloqueado (Acceso prohibido)" },
                ]}
                className="bg-[#0A1322] border-[#263858] text-white"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-semibold select-none">
                <input
                  type="checkbox"
                  checked={isSpecialGuest}
                  onChange={(e) => setIsSpecialGuest(e.target.checked)}
                  className="rounded border-[#263858] text-purple-600 focus:ring-purple-500 w-4 h-4 bg-[#0A1322]"
                />
                Marcar como Invitado Especial / VIP
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              URL de Fotografía (Opcional para credencial con foto)
            </label>
            <Input
              type="url"
              placeholder="https://ejemplo.com/fotos/perfil.jpg"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="bg-[#0A1322] border-[#263858] text-white text-xs"
            />
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
                "Registrar & Generar QR"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QrInspectionModal({
  participant,
  isOpen,
  onClose,
}: {
  participant: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !participant) return null;

  const acc = participant.accreditation;
  const cat = participant.accreditationType;

  const handlePrintBadge = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-2xl text-[#F8FAFC]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Visual Badge Card */}
        <div className="text-center pt-2">
          {cat && (
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase mb-3 shadow-md"
              style={{
                backgroundColor: cat.colorHex,
                color: cat.textColorHex || "#FFFFFF",
              }}
            >
              {cat.name} • {cat.code}
            </div>
          )}

          <h3 className="text-xl font-extrabold text-white">
            {participant.firstName} {participant.lastName}
          </h3>

          <p className="text-xs text-slate-400 mt-0.5">
            {participant.company || "Participante"}
            {participant.jobTitle ? ` • ${participant.jobTitle}` : ""}
          </p>

          <span className="text-[11px] font-mono text-purple-300 block mt-1">
            Doc: {participant.documentType} {participant.documentNumber}
          </span>

          {/* QR Code Container */}
          <div className="my-5 p-4 bg-white rounded-2xl inline-block shadow-xl border-4 border-slate-700">
            {acc?.qrCodeUrl ? (
              <img
                src={acc.qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto object-contain"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
                Sin código QR
              </div>
            )}
            <div className="text-[11px] font-mono font-bold text-slate-900 mt-2 tracking-wider">
              {acc?.codeNumber}
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-400">
            <div>
              Estado:{" "}
              <strong className="text-emerald-400 font-bold font-mono">
                {acc?.status || "APROBADO"}
              </strong>
            </div>
            <div>
              Ingresos registrados:{" "}
              <strong className="text-white font-mono">{acc?.totalCheckIns || 0}</strong>
            </div>
          </div>

          <div className="pt-5 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-[#263858] text-xs text-slate-300"
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrintBadge}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Credencial</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportCsvModal({
  isOpen,
  eventId,
  categories,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  eventId: string;
  categories: any[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [defaultTypeId, setDefaultTypeId] = useState(categories[0]?.id || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const exampleCsv = `Nombre,Apellido,Documento,Email,Empresa,Cargo,Categoria
Carlos,Ramírez,3456789,carlos@empresa.com,Banco Atlas,Gerente,VIP
María,Giménez,4567890,maria@prensa.com,Canal 9,Periodista,PRENSA
Lucas,Benítez,5678901,lucas@dev.com,Tech Solutions,Developer,GENERAL`;

  const handleProcessImport = async () => {
    if (!csvText.trim()) {
      setError("Debes pegar los datos en formato CSV");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setResult(null);

      // Parse lines
      const lines = csvText.trim().split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error("El texto debe contener una fila de encabezados y al menos una fila de datos");
      }

      // Detect header index
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
      const getIdx = (keys: string[]) => headers.findIndex((h) => keys.includes(h));

      const fnIdx = getIdx(["nombre", "nombres", "firstname", "first_name"]);
      const lnIdx = getIdx(["apellido", "apellidos", "lastname", "last_name"]);
      const docIdx = getIdx(["documento", "cedula", "ci", "dni", "documentnumber", "doc"]);
      const emIdx = getIdx(["email", "correo", "mail"]);
      const compIdx = getIdx(["empresa", "company", "institucion"]);
      const jobIdx = getIdx(["cargo", "rol", "jobtitle", "position"]);
      const catIdx = getIdx(["categoria", "category", "tipo", "code"]);

      if (fnIdx === -1 || lnIdx === -1 || docIdx === -1 || emIdx === -1) {
        throw new Error(
          "Los encabezados deben incluir al menos: Nombre, Apellido, Documento (o Cédula) y Email"
        );
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        // Simple CSV splitter handling quoted values
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length <= Math.max(fnIdx, lnIdx, docIdx, emIdx)) continue;

        rows.push({
          firstName: cols[fnIdx] || "",
          lastName: cols[lnIdx] || "",
          documentNumber: cols[docIdx] || "",
          email: cols[emIdx] || "",
          company: compIdx !== -1 ? cols[compIdx] : undefined,
          jobTitle: jobIdx !== -1 ? cols[jobIdx] : undefined,
          categoryCode: catIdx !== -1 ? cols[catIdx] : undefined,
        });
      }

      if (rows.length === 0) {
        throw new Error("No se encontraron filas de participantes válidas");
      }

      const res = await fetch("/api/v1/accreditation/participants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          rows,
          defaultAccreditationTypeId: defaultTypeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al procesar la importación masiva");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error al importar");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-2xl text-[#F8FAFC] my-8">
        <div className="flex items-center justify-between pb-4 border-b border-[#263858]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-600/50 flex items-center justify-center text-purple-300">
              <FileSpreadsheet className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Importación Masiva de Participantes</h3>
              <p className="text-xs text-slate-400">
                Pega tus datos desde Excel o CSV con detección de duplicados
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

        {result && (
          <div className="mt-4 p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <CheckCircle2 className="w-4 h-4" /> ¡Importación Completada!
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-center pt-2">
              <div className="bg-[#0A1322] p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Procesadas</span>
                <strong className="text-white text-sm">{result.totalRows}</strong>
              </div>
              <div className="bg-[#0A1322] p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Importadas OK</span>
                <strong className="text-emerald-400 text-sm">{result.importedCount}</strong>
              </div>
              <div className="bg-[#0A1322] p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block">Duplicados Omitidos</span>
                <strong className="text-amber-400 text-sm">{result.skippedDuplicatesCount}</strong>
              </div>
            </div>
          </div>
        )}

        {!result ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Categoría por defecto (para filas sin código asignado)
              </label>
              <select
                value={defaultTypeId}
                onChange={(e) => setDefaultTypeId(e.target.value)}
                className="w-full bg-[#0A1322] border border-[#263858] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Pega aquí los datos CSV (con encabezados)
                </label>
                <button
                  type="button"
                  onClick={() => setCsvText(exampleCsv)}
                  className="text-[11px] text-purple-400 hover:underline"
                >
                  Cargar Ejemplo
                </button>
              </div>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Nombre,Apellido,Documento,Email,Empresa,Cargo,Categoria..."
                className="w-full bg-[#0A1322] border border-[#263858] rounded-xl p-3 text-xs text-white font-mono focus:outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="border-[#263858] text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleProcessImport}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Iniciar Importación"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-4 flex justify-end">
            <Button
              variant="primary"
              onClick={onImported}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
            >
              Listo, Ver Participantes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
