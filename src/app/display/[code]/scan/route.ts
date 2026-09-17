import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const baseUrl = new URL(req.url).origin;

  // 1. Si el comensal ya tiene una sesión abierta para este evento, enviarlo directo a /guest
  const currentSession = await getCurrentGuestSession();
  if (currentSession && currentSession.event.code.toUpperCase() === code.toUpperCase()) {
    return NextResponse.redirect(`${baseUrl}/guest`);
  }

  // 2. Buscar evento y redirigir al selector de mesa del salón
  const event = await prisma.event.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!event || event.status !== "ACTIVE") {
    return NextResponse.redirect(`${baseUrl}/guest?error=no_active_event`);
  }

  return NextResponse.redirect(`${baseUrl}/display/${code}/tables`);
}
