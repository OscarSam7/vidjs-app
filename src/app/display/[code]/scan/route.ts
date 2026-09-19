import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const baseUrl = new URL(req.url).origin;
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

  // 1. Si el comensal ya tiene una sesión abierta para este evento, enviarlo directo a /guest
  const currentSession = await getCurrentGuestSession();
  if (
    currentSession &&
    (currentSession.event.code.toUpperCase() === baseCode ||
      currentSession.event.code.toUpperCase() === rawCode)
  ) {
    const guestUrl = new URL(`${baseUrl}/guest`);
    if (targetMode) guestUrl.searchParams.set("mode", targetMode);
    return NextResponse.redirect(guestUrl.toString());
  }

  // 2. Buscar evento y redirigir al selector de mesa del salón
  let event = await prisma.event.findUnique({
    where: { code: baseCode },
  });

  if (!event && baseCode !== rawCode) {
    event = await prisma.event.findUnique({
      where: { code: rawCode },
    });
  }

  if (!event || event.status !== "ACTIVE") {
    return NextResponse.redirect(`${baseUrl}/guest?error=no_active_event`);
  }

  return NextResponse.redirect(`${baseUrl}/display/${rawCode}/tables`);
}

