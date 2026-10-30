import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Tv, Radio, ArrowRight, Disc3, Sparkles, Headphones } from "lucide-react";

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
    <div className="min-h-screen bg-[#080F1F] text-[#F8FAFC] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
            <Tv className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC]">Lanzador de Pantalla Pública</h1>
          <p className="text-xs text-[#94A3B8]">
            Selecciona el evento para proyectar en el Smart TV o pantalla gigante del salón.
          </p>
        </div>

        <div className="space-y-3">
          {activeEvents.length === 0 ? (
            <div className="p-8 text-center bg-[#111F38] border border-[#263858] rounded-2xl text-xs text-[#94A3B8]">
              No hay eventos activos en este momento.
            </div>
          ) : (
            activeEvents.map((event) => (
              <Link
                key={event.id}
                href={`/display/${event.code}`}
                className="p-4 rounded-xl bg-[#111F38] hover:bg-[#1A2E56] border border-[#263858] hover:border-purple-500/60 transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {event.code}
                    </span>
                    <span className="text-xs text-[#94A3B8]">{event.venue.name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#F8FAFC] group-hover:text-purple-300 transition-colors">
                    {event.name}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">{event.tenant.name}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/dashboard/dj"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111F38] hover:bg-[#1A2E56] text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263858] transition-colors"
          >
            <Headphones className="w-4 h-4 text-purple-400" />
            <span>Volver al Panel de Control DJ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
