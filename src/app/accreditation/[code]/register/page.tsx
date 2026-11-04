"use client";

import React, { useState, useEffect, use } from "react";
import {
  IdCard,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  Download,
  Printer,
  QrCode,
  ShieldCheck,
  Building,
  User,
  Mail,
  Phone,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export default function PublicRegistrationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [eventData, setEventData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentType, setDocumentType] = useState("CI");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Completed registration result
  const [registeredData, setRegisteredData] = useState<any | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/v1/accreditation/public/${code}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Evento no disponible para registro");
        }
        setEventData(data.event);
        // Pre-select first available category
        const firstAvail = data.event.accreditationTypes.find((c: any) => c.isAvailable);
        if (firstAvail) {
          setSelectedCategoryId(firstAvail.id);
        }
      })
      .catch((err) => {
        setError(err.message || "Error al cargar el evento");
      })
      .finally(() => setIsLoading(false));
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !documentNumber.trim() || !email.trim()) {
      setSubmitError("Por favor completa los campos obligatorios (*)");
      return;
    }
    if (!selectedCategoryId) {
      setSubmitError("Debes seleccionar una categoría de acceso");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await fetch(`/api/v1/accreditation/public/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          documentNumber: documentNumber.trim(),
          documentType,
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          company: company.trim() || null,
          jobTitle: jobTitle.trim() || null,
          accreditationTypeId: selectedCategoryId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al registrar");
      }

      setRegisteredData(data);
    } catch (err: any) {
      setSubmitError(err.message || "Error inesperado al procesar registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQr = () => {
    if (!registeredData?.accreditation?.qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = registeredData.accreditation.qrCodeUrl;
    link.download = `Pase_${registeredData.accreditation.codeNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070D1B] flex flex-col items-center justify-center p-4 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
        <p className="text-sm font-medium">Cargando formulario de registro...</p>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-[#070D1B] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Registro No Disponible</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          {error || "El evento solicitado no se encuentra disponible para auto-registro en este momento."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070D1B] text-[#F8FAFC] py-8 px-4 sm:px-6 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      <div className="max-w-2xl mx-auto w-full">
        {/* Brand / Event Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-600/50 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider mb-3 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Pase de Acceso & Acreditación Oficial</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {eventData.name}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mt-3 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              {new Date(eventData.startsAt).toLocaleDateString("es-PY", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>

            {eventData.timeSchedule && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                {eventData.timeSchedule}
              </span>
            )}

            {eventData.locationName && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                {eventData.locationName}
              </span>
            )}
          </div>
        </div>

        {/* IF REGISTRATION COMPLETED: DISPLAY DIGITAL CREDENTIAL (PASE DE ACCESO) */}
        {registeredData ? (
          <div className="bg-[#0F1E36] border border-[#263858] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                {registeredData.alreadyRegistered ? "REGISTRO RECUPERADO" : "¡REGISTRO CONFIRMADO!"}
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                {registeredData.participant.firstName} {registeredData.participant.lastName}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {registeredData.message}
              </p>
            </div>

            {/* Rendered Digital Pass Card */}
            <div
              id="printable-badge"
              className="bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border-4 max-w-xs mx-auto text-center space-y-4"
              style={{ borderColor: registeredData.category?.colorHex || "#8B5CF6" }}
            >
              {/* Event Name */}
              <div className="border-b border-slate-200 pb-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                  PASE DIGITAL
                </span>
                <h4 className="font-extrabold text-xs text-slate-800 line-clamp-1">
                  {eventData.name}
                </h4>
              </div>

              {/* Large QR Code */}
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl inline-block shadow-inner">
                {registeredData.accreditation?.qrCodeUrl && (
                  <img
                    src={registeredData.accreditation.qrCodeUrl}
                    alt="Pase QR"
                    className="w-44 h-44 mx-auto object-contain"
                  />
                )}
              </div>

              {/* Participant info */}
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {registeredData.participant.firstName} {registeredData.participant.lastName}
                </h3>
                {registeredData.participant.company && (
                  <p className="text-xs font-semibold text-slate-700">
                    {registeredData.participant.company}
                  </p>
                )}
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Doc: {registeredData.participant.documentNumber}
                </p>
              </div>

              {/* Category Ribbon */}
              <div
                className="py-2 px-3 rounded-xl font-mono font-black text-xs uppercase tracking-widest text-white shadow-md"
                style={{ backgroundColor: registeredData.category?.colorHex || "#8B5CF6" }}
              >
                {registeredData.category?.name} • [{registeredData.accreditation?.codeNumber}]
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleDownloadQr}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg py-2.5 px-6"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Pase (PNG)</span>
              </Button>

              <Button
                variant="outline"
                onClick={handlePrint}
                className="w-full sm:w-auto border-[#263858] text-slate-300 hover:text-white text-xs flex items-center justify-center gap-2 py-2.5 px-6"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Pase</span>
              </Button>
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Guarda la imagen en tu teléfono y preséntala al ingresar en la puerta del evento para verificación instantánea.
            </p>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="bg-[#0F1E36] border border-[#263858] rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="pb-5 border-b border-[#263858] mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <IdCard className="w-5 h-5 text-purple-400" />
                Formulario de Inscripción
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Completa tus datos personales para emitir tu pase digital y código QR intransferible
              </p>
            </div>

            {submitError && (
              <div className="mb-5 p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Tipo de Acreditación / Categoría *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {eventData.accreditationTypes.map((cat: any) => {
                    const isSelected = selectedCategoryId === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        disabled={!cat.isAvailable}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between",
                          !cat.isAvailable && "opacity-40 cursor-not-allowed border-slate-800",
                          isSelected
                            ? "bg-[#0A1322] border-purple-500 shadow-md ring-1 ring-purple-500"
                            : "bg-[#0A1322]/50 border-[#263858] hover:border-slate-600 text-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.colorHex }}
                            />
                            <strong className="text-xs font-bold text-white">{cat.name}</strong>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                        </div>

                        {cat.description && (
                          <span className="text-[11px] text-slate-400 line-clamp-1 block">
                            {cat.description}
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400 mt-2 block">
                          {cat.isAvailable
                            ? cat.remaining !== null
                              ? `${cat.remaining} cupos restantes`
                              : "Cupos disponibles"
                            : "Cupos agotados"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nombres *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Laura"
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
                    placeholder="Ej: González"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>
              </div>

              {/* Document Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tipo de Doc.
                  </label>
                  <Select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    options={[
                      { value: "CI", label: "Cédula (CI)" },
                      { value: "PASSPORT", label: "Pasaporte" },
                      { value: "DNI", label: "DNI" },
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
                    placeholder="Ej: 3456789"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white font-mono"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Correo Electrónico *
                  </label>
                  <Input
                    type="email"
                    placeholder="nombre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Teléfono / WhatsApp (Opcional)
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

              {/* Company & Job */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Empresa / Institución (Opcional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Universidad Nacional"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Cargo / Especialidad (Opcional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Ej: Estudiante, Ingeniero"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="bg-[#0A1322] border-[#263858] text-white"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generando tu Pase de Acceso...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar Registro & Obtener QR</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Emisión segura y encriptada por Vidjeis Pro Security</span>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-500">
        <span>© {new Date().getFullYear()} VIDJEIS PRO • Sistema de Acreditación & Control de Acceso</span>
      </footer>
    </div>
  );
}
