import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Tv, Radio, ArrowRight, Disc3, Sparkles } from "lucide-react";

export default async function DisplayLauncherPage() {
  const activeEvents = await prisma.event.findMany({
    where: { status: "ACTIVE" },
    include: {
      venue: { select: { name: true } },
      tenant: { select: { name: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
            <Tv className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Lanzador de Pantalla Pública</h1>
          <p className="text-xs text-zinc-400">
            Selecciona el evento para proyectar en el Smart TV o pantalla gigante del salón.
          </p>
        </div>

        <div className="space-y-3">
          {activeEvents.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl text-xs text-zinc-500">
              No hay eventos activos en este momento.
            </div>
          ) : (
            activeEvents.map((event) => (
              <Link
                key={event.id}
                href={`/display/${event.code}`}
                className="p-4 rounded-xl bg-zinc-900/90 hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500/60 transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {event.code}
                    </span>
                    <span className="text-xs text-zinc-400">{event.venue.name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {event.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500">{event.tenant.name}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
