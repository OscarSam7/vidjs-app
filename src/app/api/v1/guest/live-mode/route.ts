import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { parseQueuePolicy } from "@/lib/dj/rotation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codeQuery = searchParams.get("code")?.trim().toUpperCase();

    // 1. Intentar resolver por sesión de mesa del comensal
    const guestSession = await getCurrentGuestSession().catch(() => null);

    let activeEvent = null;

    if (guestSession?.eventId) {
      activeEvent = await prisma.event.findUnique({
        where: { id: guestSession.eventId },
        select: { id: true, code: true, name: true, status: true, settings: true },
      });
    }

    // 2. Si no hay sesión o evento, resolver por código query si se pasó
    if (!activeEvent && codeQuery) {
      activeEvent = await prisma.event.findUnique({
        where: { code: codeQuery },
        select: { id: true, code: true, name: true, status: true, settings: true },
      });
    }

    // 3. Si no hay código ni sesión, resolver el evento activo más reciente del establecimiento
    if (!activeEvent) {
      activeEvent = await prisma.event.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startsAt: "desc" },
        select: { id: true, code: true, name: true, status: true, settings: true },
      });
    }

    if (!activeEvent) {
      return NextResponse.json({
        success: true,
        hasActiveEvent: false,
        nightMode: "HYBRID",
        defaultClientMode: "DJ",
      });
    }

    const policy = parseQueuePolicy(activeEvent.settings);
    const effectiveNightMode: "DJ_ONLY" | "KARAOKE_ONLY" | "HYBRID" =
      policy.nightMode === "DJ_ONLY" || (policy as any).zone === "DJ"
        ? "DJ_ONLY"
        : policy.nightMode === "KARAOKE_ONLY" || (policy as any).zone === "KARAOKE"
        ? "KARAOKE_ONLY"
        : "HYBRID";

    const defaultClientMode: "DJ" | "KARAOKE" =
      effectiveNightMode === "DJ_ONLY"
        ? "DJ"
        : effectiveNightMode === "KARAOKE_ONLY"
        ? "KARAOKE"
        : policy.zone === "DJ"
        ? "DJ"
        : "DJ"; // Si está en DJ o por defecto

    return NextResponse.json({
      success: true,
      hasActiveEvent: true,
      event: {
        id: activeEvent.id,
        code: activeEvent.code,
        name: activeEvent.name,
        status: activeEvent.status,
      },
      nightMode: effectiveNightMode,
      defaultClientMode,
      djEnabled: policy.dj.enabled && effectiveNightMode !== "KARAOKE_ONLY",
      karaokeEnabled: policy.karaoke.enabled && effectiveNightMode !== "DJ_ONLY",
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      hasActiveEvent: false,
      nightMode: "HYBRID",
      defaultClientMode: "DJ",
    });
  }
}
