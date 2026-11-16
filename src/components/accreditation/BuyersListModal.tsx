"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Filter,
  Users,
  Download,
  Share2,
  CheckCircle2,
  Clock,
  Send,
  Ticket,
  Mail,
  Phone,
  Eye,
  Loader2,
  ArrowUpDown,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface BuyerRecord {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  company: string | null;
  categoryName: string;
  categoryColor: string;
  ticketCode: string;
  price: number;
  status: string; // "APPROVED", "CHECKED_IN", "ACCREDITED", "PENDING"
  purchaseDate: string;
}

interface BuyersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventCode: string;
}

export function BuyersListModal({
  isOpen,
  onClose,
  eventId,
  eventName,
  eventCode,
}: BuyersListModalProps) {
  const [buyers, setBuyers] = useState<BuyerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    setIsLoading(true);
    fetch(`/api/v1/accreditation/participants?eventId=${eventId}&limit=200`)
      .then((res) => res.json())
      .then((data) => {
        const raw = data.participants || [];
        const formatted: BuyerRecord[] = raw.map((p: any, idx: number) => {
          const acc = p.accreditation;
          const status = acc?.status || "APPROVED";
          const cat = p.accreditationType;
          const lowerName = (cat?.name || "").toLowerCase();
          let price = 50000;
          if (lowerName.includes("feijoada") || lowerName.includes("combo")) price = 120000;
          else if (lowerName.includes("camarote") || lowerName.includes("vip")) price = 300000;
          else if (lowerName.includes("general") || lowerName.includes("lote")) price = 60000;
          else if (lowerName.includes("cortesia") || lowerName.includes("staff")) price = 0;

          return {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            documentNumber: p.documentNumber,
            documentType: p.documentType || "CI",
            email: p.email,
            phone: p.phone,
            whatsapp: p.whatsapp || p.phone,
            company: p.company || p.organization?.name || null,
            categoryName: cat?.name || "Entrada General",
            categoryColor: cat?.colorHex || "#3B82F6",
            ticketCode: acc?.codeNumber || `TKT-${eventCode}-${String(idx + 1).padStart(3, "0")}`,
            price,
            status,
            purchaseDate: p.createdAt,
          };
        });
        setBuyers(formatted);
      })
      .catch((err) => {
        console.error("Error al cargar compradores:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, eventId, eventCode]);

  const filteredBuyers = useMemo(() => {
    return buyers.filter((b) => {
      const matchSearch =
        `${b.firstName} ${b.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.documentNumber.includes(searchTerm) ||
        b.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.phone && b.phone.includes(searchTerm));

      const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchCategory = categoryFilter === "ALL" || b.categoryName === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [buyers, searchTerm, statusFilter, categoryFilter]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(buyers.map((b) => b.categoryName)));
  }, [buyers]);

  const totalGross = useMemo(() => {
    return buyers.reduce((acc, b) => acc + b.price, 0);
  }, [buyers]);

  const handleShareWhatsApp = (buyer: BuyerRecord) => {
    const phone = buyer.whatsapp?.replace(/[^0-9]/g, "");
    if (!phone) {
      alert("Este comprador no tiene número de teléfono registrado.");
      return;
    }

    const message = encodeURIComponent(
      `¡Hola ${buyer.firstName}! 🎟️ Aquí tienes tu boleto oficial para *${eventName}*.\n\n` +
        `• Entrada: *${buyer.categoryName}*\n` +
        `• Código de Boleta: *${buyer.ticketCode}*\n` +
        `• Titular: ${buyer.firstName} ${buyer.lastName} (${buyer.documentType}: ${buyer.documentNumber})\n\n` +
        `Presenta tu código QR en la entrada para tu ingreso rápido. ¡Te esperamos!`
    );

    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const handleExportCSV = () => {
    if (buyers.length === 0) return;
    const headers = [
      "ID",
      "Nombre",
      "Apellido",
      "Documento",
      "Email",
      "Telefono",
      "Empresa",
      "Tipo Entrada",
      "Codigo Boleta",
      "Monto Gs",
      "Estado",
      "Fecha",
    ];

    const rows = filteredBuyers.map((b) => [
      b.id,
      b.firstName,
      b.lastName,
      `${b.documentType} ${b.documentNumber}`,
      b.email,
      b.phone || "",
      b.company || "",
      b.categoryName,
      b.ticketCode,
      b.price,
      b.status,
      new Date(b.purchaseDate).toLocaleString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `compradores_${eventCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0A1322] border border-[#263858] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#263858] flex items-center justify-between bg-[#0F1E36]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Lista de Compradores & Boletos
                </h2>
                <Badge variant="primary" className="text-[10px] font-mono px-2 py-0.5">
                  {eventCode}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">{eventName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border-[#263858] hover:border-emerald-500 text-xs text-emerald-300 gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#080F1F] border-b border-[#263858]/80 text-xs">
          <div className="p-2.5 rounded-xl bg-[#0F1E36]/60 border border-[#263858]">
            <span className="text-slate-400 block text-[11px]">Total Boletos</span>
            <strong className="text-sm font-mono text-white font-bold">{buyers.length}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0F1E36]/60 border border-[#263858]">
            <span className="text-slate-400 block text-[11px]">Recaudación Estimada</span>
            <strong className="text-sm font-mono text-emerald-400 font-bold">
              Gs {totalGross.toLocaleString("es-PY")}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0F1E36]/60 border border-[#263858]">
            <span className="text-slate-400 block text-[11px]">Ingresados / En Sala</span>
            <strong className="text-sm font-mono text-purple-300 font-bold">
              {buyers.filter((b) => b.status === "CHECKED_IN").length}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0F1E36]/60 border border-[#263858]">
            <span className="text-slate-400 block text-[11px]">Pendientes de Ingreso</span>
            <strong className="text-sm font-mono text-amber-300 font-bold">
              {buyers.filter((b) => b.status !== "CHECKED_IN").length}
            </strong>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-[#263858] flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Buscar por nombre, CI, boleta, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#080F1F] border-[#263858] text-xs h-9 text-white w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#080F1F] border border-[#263858] text-slate-200 text-xs rounded-xl px-2.5 py-2 h-9"
            >
              <option value="ALL">Todas las entradas</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#080F1F] border border-[#263858] text-slate-200 text-xs rounded-xl px-2.5 py-2 h-9"
            >
              <option value="ALL">Todos los estados</option>
              <option value="APPROVED">Aprobado / Emitido</option>
              <option value="CHECKED_IN">Ingresado en Sala</option>
              <option value="ACCREDITED">Acreditado / Entregado</option>
              <option value="PENDING">Pendiente de Pago</option>
            </select>
          </div>
        </div>

        {/* Table list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-xs">Cargando base de compradores de Red Ticket...</p>
            </div>
          ) : filteredBuyers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Ticket className="w-10 h-10 mx-auto text-slate-600" />
              <h3 className="text-sm font-bold text-slate-300">No se encontraron compradores</h3>
              <p className="text-xs text-slate-500">
                Ajusta los filtros de búsqueda o registra nuevos asistentes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBuyers.map((buyer) => (
                <div
                  key={buyer.id}
                  className="p-3 rounded-xl bg-[#080F1F] border border-[#263858] hover:border-purple-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Buyer info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0F1E36] border border-[#263858] flex flex-col items-center justify-center font-mono font-bold text-slate-300 shrink-0">
                      <Ticket className="w-4 h-4 text-purple-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm truncate">
                          {buyer.firstName} {buyer.lastName}
                        </strong>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {buyer.documentType}: {buyer.documentNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                        <span className="font-mono text-purple-300">{buyer.ticketCode}</span>
                        <span>•</span>
                        <span>{buyer.email}</span>
                        {buyer.phone && (
                          <>
                            <span>•</span>
                            <span>{buyer.phone}</span>
                          </>
                        )}
                        {buyer.company && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300">{buyer.company}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Tier, Price & WhatsApp Share */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#263858]">
                    <div className="text-right">
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block border"
                        style={{
                          backgroundColor: `${buyer.categoryColor}20`,
                          color: buyer.categoryColor,
                          borderColor: `${buyer.categoryColor}50`,
                        }}
                      >
                        {buyer.categoryName}
                      </span>
                      <div className="text-[11px] font-mono text-emerald-400 font-bold mt-0.5">
                        Gs {buyer.price.toLocaleString("es-PY")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={buyer.status === "CHECKED_IN" ? "success" : "default"}
                        className="text-[10px]"
                      >
                        {buyer.status === "CHECKED_IN"
                          ? "En Sala"
                          : buyer.status === "APPROVED"
                          ? "Aprobado"
                          : buyer.status}
                      </Badge>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShareWhatsApp(buyer)}
                        className="border-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs px-2.5 h-8 gap-1.5"
                        title="Enviar entrada por WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">WhatsApp</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#263858] bg-[#0F1E36] flex items-center justify-between text-xs text-slate-400">
          <span>Mostrando {filteredBuyers.length} de {buyers.length} compradores</span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-300 hover:text-white">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
