import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { QrCode, Users, ArrowRight, Headphones, Mic, CheckCircle2, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TablePickerFromTvPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const rawCode = code.toUpperCase();

  let baseCode = rawCode;
  let targetMode: "DJ" | "KARAOKE" | null = null;

  if (rawCode.endsWith("-DJ")) {
    baseCode = rawCode.slice(0, -3);
    targetMode = "DJ";
  } else if (rawCode.endsWith("-KJ")) {
    baseCode = rawCode.slice(0, -3);
    targetMode = "KARAOKE";
  } else if (rawCode.endsWith("-KARAOKE")) {
    baseCode = rawCode.slice(0, -8);
    targetMode = "KARAOKE";
  }

  // Buscar evento por baseCode o rawCode
  let event = await prisma.event.findUnique({
    where: { code: baseCode },
    include: {
      venue: {
        include: {
          tables: {
            where: { active: true, number: { lt: 90 } },
            include: {
              sector: { select: { id: true, name: true, colorHex: true } },
            },
            orderBy: { number: "asc" },
          },
        },
      },
      tenant: { select: { id: true, name: true } },
    },
  });

  if (!event && baseCode !== rawCode) {
    event = await prisma.event.findUnique({
      where: { code: rawCode },
      include: {
        venue: {
          include: {
            tables: {
              where: { active: true, number: { lt: 90 } },
              include: {
                sector: { select: { id: true, name: true, colorHex: true } },
              },
              orderBy: { number: "asc" },
            },
          },
        },
        tenant: { select: { id: true, name: true } },
      },
    });
  }

  if (!event) notFound();

  // Si el local fue unificado y las mesas viven en la sede principal del establecimiento, mostrar todas las mesas activas del tenant
  let unifiedTables = event.venue.tables;
  if (unifiedTables.length === 0) {
    unifiedTables = await prisma.table.findMany({
      where: { tenantId: event.tenantId, active: true, number: { lt: 90 } },
      include: {
        sector: { select: { id: true, name: true, colorHex: true } },
      },
      orderBy: { number: "asc" },
    });
  }

  // Ordenar mostrando primero las mesas disponibles
  const sortedTables = [...unifiedTables].sort((a, b) => {
    const aAvail = a.tableStatus === "AVAILABLE" ? 0 : 1;
    const bAvail = b.tableStatus === "AVAILABLE" ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;
    return a.number - b.number;
  });

  const availableCount = sortedTables.filter((t) => t.tableStatus === "AVAILABLE").length;

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className={`inline-flex p-3 rounded-2xl border ${
              targetMode === "DJ"
                ? "bg-amber-600/10 border-amber-500/30 text-amber-400"
                : targetMode === "KARAOKE"
                ? "bg-cyan-600/10 border-cyan-500/30 text-cyan-400"
                : "bg-purple-600/10 border-purple-500/20 text-purple-400"
            }`}
          >
            {targetMode === "DJ" ? (
              <Headphones className="w-8 h-8" />
            ) : targetMode === "KARAOKE" ? (
              <Mic className="w-8 h-8" />
            ) : (
              <QrCode className="w-8 h-8" />
            )}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-1.5">
            <span>{event.tenant.name} &bull; {event.venue.name}</span>
          </div>

          {targetMode === "DJ" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold">
              <Headphones className="w-3.5 h-3.5 text-amber-400" />
              <span>INGRESO EN MODO DJ & PISTA</span>
            </div>
          )}

          {targetMode === "KARAOKE" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span>INGRESO EN MODO KARAOKE</span>
            </div>
          )}

          <h1 className="text-2xl font-black text-white">¿En qué mesa estás?</h1>
          <p className="text-xs text-zinc-400">
            {targetMode === "DJ"
              ? "Selecciona tu mesa para comenzar a pedir temas originales para que el DJ los mezcle en vivo."
              : targetMode === "KARAOKE"
              ? "Selecciona tu mesa para pedir pistas con letra sincronizada y cantar en el escenario."
              : "Selecciona tu mesa para comenzar a pedir canciones y participar del entretenimiento."}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {availableCount} mesas disponibles de {sortedTables.length}
            </span>
          </div>
        </div>

        {/* Grid de Mesas para seleccionar */}
        <div className="grid grid-cols-2 gap-2.5">
          {sortedTables.map((table) => {
            const tableHref = targetMode
              ? `/qr/${table.qrToken}?mode=${targetMode}`
              : `/qr/${table.qrToken}`;
            const isAvailable = table.tableStatus === "AVAILABLE";

            return (
              <a
                key={table.id}
                href={tableHref}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between group ${
                  isAvailable
                    ? "bg-zinc-900/90 hover:bg-purple-950/40 border-emerald-500/40 hover:border-purple-400"
                    : "bg-zinc-950/70 hover:bg-zinc-900 border-zinc-800/80 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-bold text-purple-300 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                    #{table.number}
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                      isAvailable
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {isAvailable ? "Disponible" : "Ocupada"}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                    {table.label}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                      <span className="truncate">{table.sector?.name || "Salón principal"}</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 shrink-0 text-zinc-500">
                      <Users className="w-2.5 h-2.5" />
                      {table.capacity}p
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1 font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>{isAvailable ? "Ocupar mesa" : "Unirse a mesa"}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

