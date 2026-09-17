import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { QrCode, Sparkles, Building2, Users, ArrowRight } from "lucide-react";

export default async function TablePickerFromTvPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const event = await prisma.event.findUnique({
    where: { code: code.toUpperCase() },
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

  if (!event) notFound();

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
            {event.tenant.name} &bull; {event.venue.name}
          </div>
          <h1 className="text-2xl font-black text-white">¿En qué mesa estás?</h1>
          <p className="text-xs text-zinc-400">
            Selecciona tu mesa para comenzar a pedir canciones y participar del karaoke.
          </p>
        </div>

        {/* Grid de Mesas para seleccionar */}
        <div className="grid grid-cols-2 gap-2.5">
          {event.venue.tables.map((table) => (
            <a
              key={table.id}
              href={`/qr/${table.qrToken}`}
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
              </div>

              <div className="mt-2 text-[10px] text-purple-400 flex items-center gap-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Ingresar</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
