import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startTime = Date.now();

  try {
    // Verificar conectividad con la base de datos
    const tenantCount = await prisma.tenant.count();
    const dbLatencyMs = Date.now() - startTime;

    const memory = process.memoryUsage();

    return NextResponse.json(
      {
        status: "healthy",
        uptimeSeconds: Math.floor(process.uptime()),
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
      },
      { status: 200 }
    );
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
