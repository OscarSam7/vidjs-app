"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit,
  Building,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  DollarSign,
  Users,
  PartyPopper,
  Tv,
  Gift,
  Building2,
  CreditCard,
  MessageSquare,
  ExternalLink,
  Copy,
  Info,
  Check,
  ChevronRight,
  Eye,
  Layers,
  UploadCloud,
  X,
  Maximize2,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

interface Decoration {
  id?: string;
  name: string;
  description?: string;
  imageUrl: string;
  extraPriceCents: number;
}

interface PackageItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  itemsIncluded: string[];
  pricingType: "CLEAN_FEE" | "CREDIT_CONSUMPTION" | "FIXED_COMBO";
  priceCents: number;
  creditAmountCents: number;
  maxGuests: number;
  isBirthdayPackage: boolean;
  allowScreenShoutout: boolean;
  colorHex: string;
  active: boolean;
  decorations: Decoration[];
  _count?: { reservations: number };
}

interface VenueSettings {
  id: string;
  name: string;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  bankTaxId: string | null;
  bankAlias: string | null;
  whatsappNumber: string | null;
}

export default function ReservationsDashboardPage() {
  const [activeTab, setActiveTab] = useState<"packages" | "reservations" | "settings">("packages");
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [venueSettings, setVenueSettings] = useState<VenueSettings | null>(null);
  const [liveReservations, setLiveReservations] = useState<any[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal Package state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pricingType, setPricingType] = useState<"CLEAN_FEE" | "CREDIT_CONSUMPTION" | "FIXED_COMBO">("FIXED_COMBO");
  const [price, setPrice] = useState(500000);
  const [creditAmount, setCreditAmount] = useState(500000);
  const [maxGuests, setMaxGuests] = useState(8);
  const [isBirthdayPackage, setIsBirthdayPackage] = useState(false);
  const [allowScreenShoutout, setAllowScreenShoutout] = useState(true);
  const [colorHex, setColorHex] = useState("#8B5CF6");
  const [active, setActive] = useState(true);

  // Included items array
  const [itemsIncluded, setItemsIncluded] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState("");

  // Decoration options array
  const [decorations, setDecorations] = useState<Decoration[]>([]);
  const [newDecoName, setNewDecoName] = useState("");
  const [newDecoImg, setNewDecoImg] = useState("");
  const [newDecoExtra, setNewDecoExtra] = useState(0);

  // Upload States & Lightbox
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingDeco, setIsUploadingDeco] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<{ url: string; title: string } | null>(null);

  // File Upload Helper
  const uploadImageFile = async (file: File, type: "package" | "decoration"): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    try {
      const res = await fetch("/api/v1/reservations/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.url) {
        return json.data.url;
      } else {
        alert(json.error?.message || "Error al subir la imagen");
        return null;
      }
    } catch (err: any) {
      alert("Error de conexión al subir la imagen: " + (err.message || ""));
      return null;
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const uploadedUrl = await uploadImageFile(file, "package");
      if (uploadedUrl) setImageUrl(uploadedUrl);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleDecoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDeco(true);
    try {
      const uploadedUrl = await uploadImageFile(file, "decoration");
      if (uploadedUrl) setNewDecoImg(uploadedUrl);
    } finally {
      setIsUploadingDeco(false);
    }
  };

  // Settings Form
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");
  const [bankTaxId, setBankTaxId] = useState("");
  const [bankAlias, setBankAlias] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resPkg, resSet] = await Promise.all([
        fetch("/api/v1/reservations/packages"),
        fetch("/api/v1/reservations/settings"),
      ]);

      const dataPkg = await resPkg.json();
      const dataSet = await resSet.json();

      if (dataPkg.success) setPackages(dataPkg.packages || []);
      if (dataSet.success && dataSet.settings) {
        setVenueSettings(dataSet.settings);
        setBankName(dataSet.settings.bankName || "");
        setBankAccount(dataSet.settings.bankAccount || "");
        setBankHolder(dataSet.settings.bankHolder || "");
        setBankTaxId(dataSet.settings.bankTaxId || "");
        setBankAlias(dataSet.settings.bankAlias || "");
        setWhatsappNumber(dataSet.settings.whatsappNumber || "");
      }
    } catch (err) {
      console.error("Error cargando paquetes y settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Live Reservations
  const fetchReservations = async () => {
    setIsLoadingReservations(true);
    try {
      const res = await fetch("/api/v1/reservations");
      const json = await res.json();
      if (json.success) {
        setLiveReservations(json.reservations || []);
      }
    } catch (err) {
      console.error("Error cargando reservas:", err);
    } finally {
      setIsLoadingReservations(false);
    }
  };

  const handleVerifyReservation = async (id: string, action: "APPROVE" | "REJECT") => {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/v1/reservations/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        fetchReservations();
        setStatusMessage({
          type: "success",
          text: action === "APPROVE" ? "Pago aprobado y pases confirmados" : "Pago rechazado",
        });
      } else {
        alert(json.error?.message || "Error al actualizar estado");
      }
    } catch (err: any) {
      alert("Error de conexión");
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    loadData();
    fetchReservations();
  }, []);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingPackageId(null);
    setName("");
    setDescription("");
    setImageUrl("");
    setPricingType("FIXED_COMBO");
    setPrice(650000);
    setCreditAmount(650000);
    setMaxGuests(8);
    setIsBirthdayPackage(true);
    setAllowScreenShoutout(true);
    setColorHex("#EC4899");
    setActive(true);
    setItemsIncluded([
      "1 Botella Whisky Black Label o Gin Hendrick's",
      "4 Bebidas energizantes o tónicas",
      "Torta o Champagne de cortesía",
      "8 Pulseras de Acceso VIP sin fila",
      "Saludo & Foto en Pantalla Gigante",
    ]);
    setDecorations([
      {
        name: "Decoración Neón Glow con Globos Led",
        imageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop",
        extraPriceCents: 0,
      },
      {
        name: "Elegance Dorado & Negro (Champagne Vibes)",
        imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop",
        extraPriceCents: 0,
      },
      {
        name: "Glamour Rosa & Glitter VIP",
        imageUrl: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&auto=format&fit=crop",
        extraPriceCents: 100000,
      },
    ]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (pkg: PackageItem) => {
    setEditingPackageId(pkg.id);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setImageUrl(pkg.imageUrl || "");
    setPricingType(pkg.pricingType);
    setPrice(pkg.priceCents);
    setCreditAmount(pkg.creditAmountCents || pkg.priceCents);
    setMaxGuests(pkg.maxGuests);
    setIsBirthdayPackage(pkg.isBirthdayPackage);
    setAllowScreenShoutout(pkg.allowScreenShoutout);
    setColorHex(pkg.colorHex || "#8B5CF6");
    setActive(pkg.active);
    setItemsIncluded(pkg.itemsIncluded || []);
    setDecorations(pkg.decorations || []);
    setIsModalOpen(true);
  };

  // Add Item to Included
  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setItemsIncluded((prev) => [...prev, newItemText.trim()]);
    setNewItemText("");
  };

  const handleRemoveItem = (index: number) => {
    setItemsIncluded((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Decoration Option
  const handleAddDecoration = () => {
    if (!newDecoName.trim() || !newDecoImg.trim()) {
      alert("Ingresa el nombre y la URL de la foto de la decoración");
      return;
    }
    setDecorations((prev) => [
      ...prev,
      {
        name: newDecoName.trim(),
        imageUrl: newDecoImg.trim(),
        extraPriceCents: Number(newDecoExtra) || 0,
      },
    ]);
    setNewDecoName("");
    setNewDecoImg("");
    setNewDecoExtra(0);
  };

  const handleRemoveDecoration = (index: number) => {
    setDecorations((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);

    const payload = {
      name,
      description,
      imageUrl,
      pricingType,
      priceCents: Number(price),
      creditAmountCents: pricingType === "CREDIT_CONSUMPTION" ? Number(creditAmount) : 0,
      maxGuests: Number(maxGuests),
      isBirthdayPackage,
      allowScreenShoutout,
      colorHex,
      active,
      itemsIncluded,
      decorations,
    };

    try {
      const endpoint = editingPackageId
        ? `/api/v1/reservations/packages/${editingPackageId}`
        : "/api/v1/reservations/packages";
      const method = editingPackageId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.message || "Error al guardar paquete" });
      } else {
        setStatusMessage({
          type: "success",
          text: editingPackageId ? "Paquete actualizado con éxito" : "Nuevo paquete creado con éxito",
        });
        setIsModalOpen(false);
        loadData();
      }
    } catch {
      setStatusMessage({ type: "error", text: "Error de red al conectar con el servidor" });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Package
  const handleDeletePackage = async (id: string, pkgName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el paquete "${pkgName}"?`)) return;

    try {
      const res = await fetch(`/api/v1/reservations/packages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error al eliminar");
      } else {
        setPackages((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      alert("Error al eliminar paquete");
    }
  };

  // Save Bank & WhatsApp Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/v1/reservations/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName,
          bankAccount,
          bankHolder,
          bankTaxId,
          bankAlias,
          whatsappNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.message || "Error al guardar configuración" });
      } else {
        setStatusMessage({
          type: "success",
          text: "Datos bancarios y canal WhatsApp guardados correctamente",
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper format price
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-PY").format(amount) + " Gs.";
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1E36] border border-[#263858] rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
              Módulo de Reservas & Camarotes
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <PartyPopper className="w-6 h-6 text-pink-400" />
            Paquetes de Cumpleaños & Camarotes VIP
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Crea ofertas irresistibles para reservas anticipadas: combos con bebidas, tortas, saludos en la pantalla gigante de TV y opciones fotográficas de decoración para que el cliente elija.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Paquete / Combo</span>
          </Button>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            statusMessage.type === "success"
              ? "bg-emerald-950/60 border-emerald-700/80 text-emerald-200"
              : "bg-red-950/60 border-red-700/80 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white px-2">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#263858] gap-4">
        <button
          onClick={() => setActiveTab("packages")}
          className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "packages"
              ? "border-purple-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Catálogo de Paquetes ({packages.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("reservations");
            fetchReservations();
          }}
          className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "reservations"
              ? "border-pink-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <Calendar className="w-4 h-4 text-pink-400" />
          <span>Solicitudes & Reservas en Vivo ({liveReservations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "settings"
              ? "border-purple-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>Datos Bancarios (Transferencias) & WhatsApp</span>
        </button>
      </div>

      {/* TAB 1: PACKAGES & BIRTHDAY COMBOS */}
      {activeTab === "packages" && (
        <div>
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
              Cargando catálogo de paquetes...
            </div>
          ) : packages.length === 0 ? (
            <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-12 text-center max-w-xl mx-auto my-6">
              <PartyPopper className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Aún no has creado ningún paquete</h3>
              <p className="text-xs text-slate-400 mb-5">
                Crea tu primer paquete de cumpleaños o camarote VIP con opciones de decoración fotográfica para que tus clientes puedan reservar y pagar por adelantado.
              </p>
              <Button
                variant="primary"
                onClick={handleOpenCreateModal}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Crear Primer Paquete
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((pkg) => {
                return (
                  <div
                    key={pkg.id}
                    className="bg-[#0F1E36] border border-[#263858] rounded-2xl overflow-hidden shadow-md hover:border-purple-500/50 transition-all flex flex-col justify-between group"
                  >
                    {/* Header Image or Gradient Banner */}
                    <div
                      className="h-32 relative bg-cover bg-center overflow-hidden flex items-start justify-between p-3.5"
                      style={{
                        backgroundImage: pkg.imageUrl
                          ? `linear-gradient(to bottom, rgba(15,30,54,0.3), rgba(15,30,54,0.9)), url(${pkg.imageUrl})`
                          : "linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)",
                      }}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.isBirthdayPackage && (
                          <span className="bg-pink-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                            🎂 CUMPLEAÑOS
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow ${
                            pkg.pricingType === "CLEAN_FEE"
                              ? "bg-blue-600/90"
                              : pkg.pricingType === "CREDIT_CONSUMPTION"
                              ? "bg-emerald-600/90"
                              : "bg-purple-600/90"
                          }`}
                        >
                          {pkg.pricingType === "CLEAN_FEE"
                            ? "Alquiler Puro"
                            : pkg.pricingType === "CREDIT_CONSUMPTION"
                            ? "100% Consumo"
                            : "Combo Cerrado"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-lg p-1">
                        <button
                          onClick={() => handleOpenEditModal(pkg)}
                          className="p-1 text-slate-300 hover:text-white"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                          className="p-1 text-slate-300 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3.5 flex-1">
                      <div>
                        <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors">
                          {pkg.name}
                        </h3>
                        {pkg.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{pkg.description}</p>
                        )}
                      </div>

                      {/* Pricing and Capacity */}
                      <div className="flex items-center justify-between bg-[#0A1322] border border-[#263858] rounded-xl p-2.5">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Precio Total</span>
                          <span className="text-base font-black text-white">{formatMoney(pkg.priceCents)}</span>
                          {pkg.pricingType === "CREDIT_CONSUMPTION" && (
                            <span className="text-[9px] text-emerald-400 block font-semibold">
                              Saldo a favor: {formatMoney(pkg.creditAmountCents)}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Capacidad</span>
                          <span className="text-xs font-bold text-purple-300 flex items-center justify-end gap-1">
                            <Users className="w-3 h-3" />
                            Hasta {pkg.maxGuests} pers.
                          </span>
                        </div>
                      </div>

                      {/* Perks included */}
                      {pkg.itemsIncluded.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Incluye en el paquete:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {pkg.itemsIncluded.map((item, idx) => (
                              <span
                                key={idx}
                                className="bg-[#14233C] text-slate-200 border border-[#263858] text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                              >
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Special screen shoutout note */}
                      {pkg.allowScreenShoutout && (
                        <div className="text-[10px] text-purple-300 bg-purple-950/40 border border-purple-800/40 rounded-lg p-2 flex items-center gap-2">
                          <Tv className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Habilita saludo y foto proyectada en las pantallas gigantes de TV.</span>
                        </div>
                      )}

                      {/* DECORATION GALLERY PREVIEW */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Opciones de Decoración ({pkg.decorations?.length || 0})
                          </span>
                        </div>

                        {pkg.decorations && pkg.decorations.length > 0 ? (
                          <div className="grid grid-cols-3 gap-1.5">
                            {pkg.decorations.map((deco, idx) => (
                              <div
                                key={idx}
                                onClick={() => setPreviewModalImg({ url: deco.imageUrl, title: `${pkg.name} • ${deco.name}` })}
                                className="group/deco relative rounded-lg overflow-hidden border border-[#263858] bg-[#0A1322] text-center cursor-pointer hover:border-pink-500/60 transition-all shadow-sm"
                                title="Clic para ampliar foto"
                              >
                                <img
                                  src={deco.imageUrl}
                                  alt={deco.name}
                                  className="w-full h-14 object-cover group-hover/deco:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs rounded p-0.5 opacity-0 group-hover/deco:opacity-100 transition-opacity">
                                  <Eye className="w-2.5 h-2.5 text-pink-300" />
                                </div>
                                <div className="p-1">
                                  <span className="text-[9px] font-bold text-white block truncate">
                                    {deco.name}
                                  </span>
                                  <span className="text-[8px] text-pink-300 block font-mono font-semibold">
                                    {deco.extraPriceCents > 0 ? `+${formatMoney(deco.extraPriceCents)}` : "Incluida"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic block">
                            Sin opciones de decoración asignadas.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-3 bg-[#0A1322] border-t border-[#263858] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {pkg._count?.reservations || 0} reservas realizadas
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(pkg)}
                        className="text-purple-400 hover:text-purple-300 text-xs p-1"
                      >
                        Configurar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE RESERVATIONS & APPROVAL QUEUE */}
      {activeTab === "reservations" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0F1E36] border border-[#263858] p-4 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-400" />
                <span>Gestión de Reservas & Comprobantes de Pago</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Revisa los comprobantes adjuntados, aprueba pagos y visualiza la foto de la temática que eligió cada cliente.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReservations}
              disabled={isLoadingReservations}
              className="border-[#263858] text-xs text-slate-300"
            >
              {isLoadingReservations ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Actualizar"}
            </Button>
          </div>

          {isLoadingReservations ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
              <span>Cargando reservas en vivo...</span>
            </div>
          ) : liveReservations.length === 0 ? (
            <div className="bg-[#0F1E36] border border-[#263858] p-10 rounded-2xl text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No hay reservas registradas</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Los clientes pueden ingresar a la página pública de reservas para seleccionar su paquete, elegir la foto de la decoración y adjuntar su comprobante.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {liveReservations.map((res: any) => (
                <div
                  key={res.id}
                  className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-500 transition-colors"
                >
                  {/* Left Column: Customer & Event Info */}
                  <div className="space-y-1.5 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
                        Mesa #{res.table?.number} ({res.table?.label})
                      </span>
                      <Badge
                        variant={
                          res.paymentStatus === "APPROVED"
                            ? "success"
                            : res.paymentStatus === "PENDING_REVIEW"
                            ? "warning"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {res.paymentStatus === "APPROVED"
                          ? "✓ Pago Aprobado"
                          : res.paymentStatus === "PENDING_REVIEW"
                          ? "Comprobante en Revisión"
                          : "Pendiente"}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-white">{res.customerName}</h3>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      {res.customerPhone && (
                        <a
                          href={`https://wa.me/${res.customerPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>{res.customerPhone}</span>
                        </a>
                      )}
                      <span>
                        Fecha:{" "}
                        {new Date(res.reservationDate).toLocaleDateString("es-PY", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>

                    {res.birthdayPersonName && (
                      <div className="text-[11px] text-pink-300 font-semibold flex items-center gap-1.5 pt-0.5">
                        <Gift className="w-3.5 h-3.5 text-pink-400" />
                        <span>Cumpleañero: {res.birthdayPersonName}</span>
                        {res.birthdayPhotoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModalImg({
                                url: res.birthdayPhotoUrl,
                                title: `Cumpleañero: ${res.birthdayPersonName}`,
                              })
                            }
                            className="underline text-[10px] text-purple-300 ml-1"
                          >
                            (Ver foto TV)
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Package & Chosen Decoration with Photo */}
                  <div className="flex-1 bg-[#0A1322] border border-[#263858] p-3 rounded-xl flex items-center gap-3">
                    {res.decoration ? (
                      <img
                        src={res.decoration.imageUrl}
                        alt={res.decoration.name}
                        onClick={() =>
                          setPreviewModalImg({
                            url: res.decoration.imageUrl,
                            title: `Decoración Elegida: ${res.decoration.name}`,
                          })
                        }
                        className="w-16 h-14 object-cover rounded-lg border border-pink-600/50 cursor-pointer hover:opacity-90 shrink-0"
                        title="Clic para ampliar foto de decoración"
                      />
                    ) : (
                      <div className="w-16 h-14 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] text-center p-1 shrink-0">
                        Sin foto deco
                      </div>
                    )}

                    <div className="truncate text-xs space-y-0.5">
                      <span className="font-bold text-white block truncate">{res.package?.name || "VIP"}</span>
                      {res.decoration && (
                        <span className="text-[11px] text-pink-300 font-medium block truncate">
                          🎨 Ambientación: {res.decoration.name}
                        </span>
                      )}
                      <div className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
                        <span className="font-bold text-white">{formatMoney(res.totalAmountCents)}</span>
                        {res.pricingType === "CREDIT_CONSUMPTION" && (
                          <span className="text-emerald-400 font-semibold">
                            (Saldo mesa: {formatMoney(res.creditAmountCents)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Payment Proof & Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {res.paymentProofUrl ? (
                      <button
                        type="button"
                        onClick={() => setProofModalUrl(res.paymentProofUrl)}
                        className="px-3 py-2 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-300 hover:bg-purple-900 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Comprobante</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic px-2">Sin comprobante</span>
                    )}

                    {res.paymentStatus !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleVerifyReservation(res.id, "APPROVE")}
                        disabled={verifyingId === res.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5"
                      >
                        {verifyingId === res.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        <span>Aprobar Pago</span>
                      </Button>
                    )}

                    {res.paymentStatus === "PENDING_REVIEW" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyReservation(res.id, "REJECT")}
                        disabled={verifyingId === res.id}
                        className="border-red-800/60 text-red-300 hover:bg-red-950/40 text-xs py-2 px-2.5 rounded-xl"
                        title="Rechazar comprobante"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BANK TRANSFERS & WHATSAPP SETTINGS */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bank Account Form */}
          <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Datos para Transferencias Bancarias (SIPAP / PIX)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Estos datos se le mostrarán automáticamente al cliente cuando elija pagar su mesa o camarote por transferencia bancaria.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Banco</label>
                <Input
                  type="text"
                  placeholder="Ej: Banco Itaú / Banco Continental / Ueno"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Número de Cuenta</label>
                  <Input
                    type="text"
                    placeholder="Ej: 123456789"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">RUC / C.I. del Titular</label>
                  <Input
                    type="text"
                    placeholder="Ej: 80012345-6"
                    value={bankTaxId}
                    onChange={(e) => setBankTaxId(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Titular / Razón Social</label>
                <Input
                  type="text"
                  placeholder="Ej: Vidjeis Bar S.A."
                  value={bankHolder}
                  onChange={(e) => setBankHolder(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Alias SIPAP / Clave PIX / Teléfono</label>
                <Input
                  type="text"
                  placeholder="Ej: 0981-123-456 o alias@banco"
                  value={bankAlias}
                  onChange={(e) => setBankAlias(e.target.value)}
                  className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                />
              </div>

              <div className="pt-2 border-t border-[#263858]/60">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Canal Oficial de WhatsApp (Bot / Asistente)</span>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Número de WhatsApp con código de país (sin espacios ni guiones)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: 595981123456"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs mt-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Guardar Datos de Pago & WhatsApp"}
              </Button>
            </form>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-4">
            <div className="bg-[#0A1322] border border-[#263858] rounded-2xl p-6 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60 block w-max mb-3">
                Vista Previa del Cliente
              </span>
              <h3 className="text-base font-bold text-white mb-2">Cómo lo verá el cliente en su celular</h3>
              <p className="text-xs text-slate-400 mb-4">
                Al seleccionar "Pagar por Transferencia Bancaria", el cliente verá este comprobante interactivo para copiar los datos con un solo toque:
              </p>

              {/* Mock Mobile View Card */}
              <div className="bg-gradient-to-b from-[#182844] to-[#0D1829] border border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#263858] pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">{bankName || "Banco Itaú"}</span>
                  </div>
                  <span className="bg-emerald-950 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full font-bold">
                    TRANSFERENCIA DIRECTA
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-[#070E1A] p-2 rounded-lg">
                    <span className="text-slate-400 text-[11px]">N° de Cuenta:</span>
                    <span className="font-mono font-bold text-white">{bankAccount || "123456789"}</span>
                  </div>

                  <div className="flex justify-between items-center bg-[#070E1A] p-2 rounded-lg">
                    <span className="text-slate-400 text-[11px]">Titular:</span>
                    <span className="font-bold text-white">{bankHolder || "Vidjeis Bar S.A."}</span>
                  </div>

                  <div className="flex justify-between items-center bg-[#070E1A] p-2 rounded-lg">
                    <span className="text-slate-400 text-[11px]">RUC / Documento:</span>
                    <span className="font-mono font-bold text-white">{bankTaxId || "80012345-6"}</span>
                  </div>

                  {bankAlias && (
                    <div className="flex justify-between items-center bg-[#070E1A] p-2 rounded-lg">
                      <span className="text-slate-400 text-[11px]">Alias SIPAP / PIX:</span>
                      <span className="font-mono font-bold text-purple-300">{bankAlias}</span>
                    </div>
                  )}
                </div>

                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs p-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Avisar o Consultar por WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR PAQUETE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0F1E36] border border-[#263858] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 bg-[#0A1322] border-b border-[#263858] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white text-sm">
                  {editingPackageId ? "Editar Paquete / Combo" : "Crear Nuevo Paquete o Combo"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Name & Birthday Check */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nombre del Paquete</label>
                  <Input
                    type="text"
                    placeholder="Ej: Combo Cumpleaños VIP Black Label"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Color Identificador</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-9 h-8 rounded bg-transparent cursor-pointer border border-[#263858]"
                    />
                    <Input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="bg-[#0A1322] border-[#263858] text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Descripción del Combo</label>
                <textarea
                  rows={2}
                  placeholder="Detalles breves de la experiencia VIP..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0A1322] border border-[#263858] rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              {/* Cover Image URL / Upload */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Foto de Portada del Combo / Espacio
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="url"
                    placeholder="https://... o sube una imagen directamente"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs flex-1"
                  />
                  <label className="cursor-pointer bg-[#14233C] hover:bg-[#1E355B] border border-[#263858] text-purple-300 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow">
                    {isUploadingCover ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploadingCover ? "Subiendo..." : "Subir Foto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverFileChange}
                      disabled={isUploadingCover}
                    />
                  </label>
                </div>
                {imageUrl && (
                  <div className="mt-2 flex items-center gap-3 bg-[#0A1322] border border-[#263858] p-2 rounded-xl">
                    <img
                      src={imageUrl}
                      alt="Portada"
                      className="w-16 h-12 rounded-lg object-cover border border-slate-700 cursor-pointer hover:opacity-90"
                      onClick={() => setPreviewModalImg({ url: imageUrl, title: name || "Portada del Paquete" })}
                    />
                    <div className="text-[11px] text-slate-300 flex-1 truncate">
                      <span className="text-emerald-400 font-bold block">✓ Imagen vinculada</span>
                      <span className="text-slate-400 font-mono text-[10px] truncate block">{imageUrl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="text-slate-400 hover:text-red-400 text-xs p-1"
                      title="Quitar foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Pricing Type & Financials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0A1322] border border-[#263858] p-3 rounded-xl">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Modalidad de Cobro</label>
                  <select
                    value={pricingType}
                    onChange={(e: any) => setPricingType(e.target.value)}
                    className="w-full bg-[#0F1E36] border border-[#263858] text-white text-xs rounded-lg p-2"
                  >
                    <option value="FIXED_COMBO">Combo Cerrado (Bebidas incluidas)</option>
                    <option value="CLEAN_FEE">Reserva Limpia (Alquiler de Espacio)</option>
                    <option value="CREDIT_CONSUMPTION">100% Consumo Acreditable (Saldo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Precio Total (Gs.)</label>
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    required
                    className="bg-[#0F1E36] border-[#263858] text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Capacidad Máx.</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={maxGuests}
                    onChange={(e) => setMaxGuests(Number(e.target.value))}
                    required
                    className="bg-[#0F1E36] border-[#263858] text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* If Credit Consumption */}
              {pricingType === "CREDIT_CONSUMPTION" && (
                <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-emerald-300">Saldo Acreditable en Barra:</span>
                  <p className="text-slate-300 text-[11px]">
                    El cliente paga {formatMoney(price)} y se le cargarán como saldo a favor en la mesa para consumir durante la noche.
                  </p>
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="bg-[#0A1322] border-emerald-700/60 text-emerald-200 text-xs font-mono"
                  />
                </div>
              )}

              {/* Checkboxes: Birthday & Screen Shoutout */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBirthdayPackage}
                    onChange={(e) => setIsBirthdayPackage(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0A1322] border-[#263858] text-pink-600 focus:ring-0"
                  />
                  <span>🎂 ¿Es un Paquete Especial para Cumpleañeros?</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowScreenShoutout}
                    onChange={(e) => setAllowScreenShoutout(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0A1322] border-[#263858] text-purple-600 focus:ring-0"
                  />
                  <span>📺 Proyectar saludo y foto del cumpleañero en pantallas gigantes de TV (`/display`)</span>
                </label>
              </div>

              {/* ITEMS INCLUDED TAGS */}
              <div className="border-t border-[#263858] pt-3">
                <label className="text-xs font-bold text-white block mb-1">
                  Artículos y Beneficios Incluidos en el Combo
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Ej: 1 Whisky Black Label, Torta de cortesía..."
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    className="bg-[#0A1322] border-[#263858] text-white text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItem}
                    className="border-[#263858] text-xs text-purple-300"
                  >
                    Agregar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {itemsIncluded.map((item, idx) => (
                    <span
                      key={idx}
                      className="bg-[#0A1322] border border-[#263858] text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-red-400 text-xs ml-1"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* DECORATION OPTIONS WITH PHOTOS */}
              <div className="border-t border-[#263858] pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-pink-400" />
                      <span>Opciones de Decoración para que el cliente elija (con foto)</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Sube las opciones de estilo (Neón, Globos, Elegance) para que el cliente seleccione su favorita al reservar.
                    </p>
                  </div>
                </div>

                {/* Add new decoration row */}
                <div className="bg-[#0A1322] border border-[#263858] p-3.5 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                    <div className="md:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Nombre del Estilo / Temática
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: Neón Glow con Globos Led"
                        value={newDecoName}
                        onChange={(e) => setNewDecoName(e.target.value)}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs"
                      />
                    </div>
                    <div className="md:col-span-5">
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Foto Real de la Decoración
                      </label>
                      <div className="flex gap-1.5 items-center">
                        <Input
                          type="url"
                          placeholder="URL o sube una foto ->"
                          value={newDecoImg}
                          onChange={(e) => setNewDecoImg(e.target.value)}
                          className="bg-[#0F1E36] border-[#263858] text-white text-xs flex-1"
                        />
                        <label className="cursor-pointer bg-pink-950/40 hover:bg-pink-900/60 border border-pink-700/60 text-pink-200 text-xs px-2.5 py-2 rounded-xl flex items-center gap-1 shrink-0 transition-colors shadow">
                          {isUploadingDeco ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5 text-pink-400" />
                          )}
                          <span className="text-[11px] font-semibold">
                            {isUploadingDeco ? "Subiendo..." : "Subir Foto"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleDecoFileChange}
                            disabled={isUploadingDeco}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Costo Adicional (Gs.)
                      </label>
                      <Input
                        type="number"
                        placeholder="0 = Incluido gratis"
                        value={newDecoExtra || ""}
                        onChange={(e) => setNewDecoExtra(Number(e.target.value))}
                        className="bg-[#0F1E36] border-[#263858] text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Thumbnail preview of the photo being added */}
                  {newDecoImg && (
                    <div className="flex items-center gap-3 bg-[#0F1E36] border border-pink-900/40 p-2 rounded-xl">
                      <img
                        src={newDecoImg}
                        alt="Preview decoración"
                        className="w-14 h-12 object-cover rounded-lg border border-pink-700/40 cursor-pointer hover:opacity-90"
                        onClick={() => setPreviewModalImg({ url: newDecoImg, title: newDecoName || "Foto de Decoración" })}
                      />
                      <div className="text-[11px] text-slate-300 flex-1 truncate">
                        <span className="text-pink-300 font-bold block flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Foto de decoración lista para vincular
                        </span>
                        <span className="text-slate-400 font-mono text-[10px] truncate block">{newDecoImg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewDecoImg("")}
                        className="text-slate-400 hover:text-red-400 text-xs p-1"
                        title="Quitar foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDecoration}
                    disabled={isUploadingDeco}
                    className="w-full border-pink-700/60 bg-pink-950/30 text-pink-200 hover:bg-pink-900/50 text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Esta Opción de Decoración a la Lista</span>
                  </Button>
                </div>

                {/* Decoration Gallery List */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {decorations.map((deco, idx) => (
                    <div
                      key={idx}
                      className="group/item relative bg-[#0A1322] border border-[#263858] rounded-xl overflow-hidden shadow-sm hover:border-pink-500/50 transition-all"
                    >
                      <img
                        src={deco.imageUrl}
                        alt={deco.name}
                        className="w-full h-24 object-cover cursor-pointer group-hover/item:scale-105 transition-transform"
                        onClick={() => setPreviewModalImg({ url: deco.imageUrl, title: deco.name })}
                      />
                      <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[9px] text-white flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5 text-pink-400" />
                        <span>Zoom</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDecoration(idx)}
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                        title="Eliminar opción"
                      >
                        ✕
                      </button>
                      <div className="p-2">
                        <span className="font-bold text-white text-xs block truncate">{deco.name}</span>
                        <span className="text-[10px] text-pink-300 font-mono">
                          {deco.extraPriceCents > 0 ? `+${formatMoney(deco.extraPriceCents)}` : "Incluida en el combo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#263858]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-[#263858] text-slate-300 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Paquete"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* LIGHTBOX / ZOOM FOTO MODAL */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-[#0F1E36] border border-[#263858] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-[#0A1322] border-b border-[#263858] flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate">{previewModalImg.title}</span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-black/50 flex items-center justify-center">
              <img
                src={previewModalImg.url}
                alt={previewModalImg.title}
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
      {/* PROOF OF PAYMENT MODAL */}
      {proofModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          onClick={() => setProofModalUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#0F1E36] border border-[#263858] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-[#0A1322] border-b border-[#263858] flex items-center justify-between">
              <span className="text-xs font-bold text-white">Comprobante de Transferencia Bancaria</span>
              <button
                type="button"
                onClick={() => setProofModalUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-black/60 flex items-center justify-center">
              <img
                src={proofModalUrl}
                alt="Comprobante"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
