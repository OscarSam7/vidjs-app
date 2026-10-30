import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { QrCode, Sparkles, Building2, Users, ArrowRight, Headphones, Mic } from "lucide-react";

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
            where: { active: true },
            orderBy: { number: "asc" },
          },
        },
      },
      tenant: { select: { name: true } },
    },
  });

  if (!event && baseCode !== rawCode) {
    event = await prisma.event.findUnique({
      where: { code: rawCode },
      include: {
        venue: {
          include: {
            tables: {
              where: { active: true },
              orderBy: { number: "asc" },
            },
          },
        },
        tenant: { select: { name: true } },
      },
    });
  }

  if (!event) notFound();

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
        </div>

        {/* Grid de Mesas para seleccionar */}
        <div className="grid grid-cols-2 gap-2.5">
          {event.venue.tables.map((table) => {
            const tableHref = targetMode
              ? `/qr/${table.qrToken}?mode=${targetMode}`
              : `/qr/${table.qrToken}`;

            return (
              <a
                key={table.id}
                href={tableHref}
                className="p-3.5 rounded-xl bg-zinc-900/90 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500/60 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-300 px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800">
                    #{table.number}
                  </span>
                  <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {table.capacity}p
                  </span>
                </div>

                <div className="mt-2">
                  <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                    {table.label}
                  </div>
                  {table.zone && table.zone !== "MAIN" && (
                    <span className="text-[9px] text-zinc-400 font-mono">
                      Zona {table.zone}
                    </span>
                  )}
                </div>

                <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Ingresar</span>
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

