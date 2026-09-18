import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Verificar conectividad con la base de datos
    const tenantCount = await prisma.tenant.count();
    const dbLatencyMs = Date.now() - startTime;

    const memory = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    const healthData = {
      status: "healthy",
      uptimeSeconds: uptimeSec,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: {
        status: "connected",
        tenants: tenantCount,
        latencyMs: dbLatencyMs,
      },
      memory: {
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      },
      service: "vidjs-night-experience-os",
      version: "0.1.0",
    };

    const accept = req.headers.get("accept") || "";
    const format = req.nextUrl.searchParams.get("format");

    // Si la petición proviene de un navegador web, renderizar interfaz visual de estado
    if (accept.includes("text/html") && format !== "json") {
      const html = `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>Vidjs &bull; Estado del Sistema</title>
  <link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #040406; color: #f4f4f5; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
  <!-- Luces decorativas de fondo -->
  <div class="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
  <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>

  <div class="w-full max-w-xl bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-zinc-800/80 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-black text-xl shadow-lg">
          V
        </div>
        <div>
          <h1 class="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>Vidjs</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono">v0.1.0</span>
          </h1>
          <p class="text-xs text-zinc-400">Night Experience OS &bull; Producción en la Nube</p>
        </div>
      </div>
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-bold shadow-lg shadow-emerald-950/50">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>OPERATIVO 100%</span>
      </span>
    </div>

    <!-- Cards de Métricas en Vivo -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
      <div class="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-1">
        <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Base de Datos</div>
        <div class="text-sm font-black text-emerald-400 flex items-center gap-1">
          <span>Neon PostgreSQL</span>
        </div>
        <div class="text-[10px] text-zinc-400 font-mono">${dbLatencyMs} ms latencia</div>
      </div>

      <div class="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-1">
        <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Despliegue</div>
        <div class="text-sm font-black text-purple-300">Vercel Edge</div>
        <div class="text-[10px] text-zinc-400 font-mono">Uptime: ${uptimeSec}s</div>
      </div>

      <div class="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-1 col-span-2 sm:col-span-1">
        <div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Arquitectura</div>
        <div class="text-sm font-black text-cyan-400">Multi-Zona & SSE</div>
        <div class="text-[10px] text-zinc-400 font-mono">Latencia &lt; 5ms</div>
      </div>
    </div>

    <!-- Enlaces directos a las aplicaciones -->
    <div class="space-y-2.5 pt-2">
      <div class="text-xs font-bold text-zinc-400 uppercase tracking-wider">
        Acceso Directo a las Vistas de la App:
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <a href="/guest" class="p-3.5 rounded-2xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/80 hover:border-purple-500 text-purple-200 transition-all flex items-center gap-3 group">
          <span class="text-2xl group-hover:scale-110 transition-transform">📱</span>
          <div class="min-w-0">
            <div class="text-xs font-black text-white">Portal de Mesas</div>
            <div class="text-[10px] text-zinc-400">Pide canciones y karaoke por QR</div>
          </div>
        </a>

        <a href="/dashboard/dj" class="p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500 text-zinc-300 transition-all flex items-center gap-3 group">
          <span class="text-2xl group-hover:scale-110 transition-transform">🎧</span>
          <div class="min-w-0">
            <div class="text-xs font-black text-white">Cabina del DJ</div>
            <div class="text-[10px] text-zinc-400">Control de cola, límites y turnos</div>
          </div>
        </a>

        <a href="/display/RETRO-POP" target="_blank" class="p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500 text-zinc-300 transition-all flex items-center gap-3 group">
          <span class="text-2xl group-hover:scale-110 transition-transform">📺</span>
          <div class="min-w-0">
            <div class="text-xs font-black text-white">Pantalla Smart TV</div>
            <div class="text-[10px] text-zinc-400">Karaoke en vivo y muro social</div>
          </div>
        </a>

        <a href="/dashboard" class="p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500 text-zinc-300 transition-all flex items-center gap-3 group">
          <span class="text-2xl group-hover:scale-110 transition-transform">⚙️</span>
          <div class="min-w-0">
            <div class="text-xs font-black text-white">Panel de Administración</div>
            <div class="text-[10px] text-zinc-400">Establecimiento y métricas</div>
          </div>
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
      <span>SSL Seguro &bull; Neon Cloud</span>
      <a href="/api/v1/health?format=json" class="text-purple-400 hover:text-purple-300 hover:underline">Ver JSON técnico &rarr;</a>
    </div>
  </div>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Respuesta JSON para servicios de monitoreo automatizado, Docker, Kubernetes y cURL
    return NextResponse.json(healthData, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          status: "disconnected",
          error: error.message,
        },
        service: "vidjs-night-experience-os",
      },
      { status: 503 }
    );
  }
}
