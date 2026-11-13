import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { getRequestOrigin, sanitizePublicUrl } from "@/lib/url";
import { parseQueuePolicy } from "@/lib/dj/rotation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const baseUrl = getRequestOrigin(req);
  const rawCode = code.toUpperCase();

  let baseCode = rawCode;
  let targetMode: "DJ" | "KARAOKE" | null = null;

  // 1. Detectar modo por sufijo en el código
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

  // 2. O por parámetro de query URL explícito (?mode=DJ)
  const incomingMode = req.nextUrl.searchParams.get("mode")?.toUpperCase();
  if (incomingMode === "DJ" || incomingMode === "KARAOKE") {
    targetMode = incomingMode as "DJ" | "KARAOKE";
  }

  // 3. Buscar evento en la base de datos
  let event = await prisma.event.findUnique({
    where: { code: baseCode },
  });

  if (!event && baseCode !== rawCode) {
    event = await prisma.event.findUnique({
      where: { code: rawCode },
    });
  }

  // Si no se definió modo por sufijo ni query, deducirlo directamente de la política activa del evento
  if (!targetMode && event?.settings) {
    try {
      const policy = parseQueuePolicy(event.settings);
      if (policy.nightMode === "DJ_ONLY" || policy.zone === "DJ") {
        targetMode = "DJ";
      } else if (policy.nightMode === "KARAOKE_ONLY" || policy.zone === "KARAOKE") {
        targetMode = "KARAOKE";
      }
    } catch {}
  }

  // 4. Si el comensal ya tiene una sesión abierta para este evento, enviarlo directo a /guest
  const currentSession = await getCurrentGuestSession();
  if (
    currentSession &&
    (currentSession.event.code.toUpperCase() === baseCode ||
      currentSession.event.code.toUpperCase() === rawCode)
  ) {
    const guestUrl = new URL(`${baseUrl}/guest`);
    if (targetMode) guestUrl.searchParams.set("mode", targetMode);
    return NextResponse.redirect(sanitizePublicUrl(guestUrl.toString(), req));
  }

  if (!event || event.status !== "ACTIVE") {
    return NextResponse.redirect(sanitizePublicUrl(`${baseUrl}/guest?error=no_active_event`, req));
  }

  // 5. Redirigir al selector de mesa del salón propagando el modo DJ o Karaoke
  const tablesUrl = new URL(`${baseUrl}/display/${rawCode}/tables`);
  if (targetMode) {
    tablesUrl.searchParams.set("mode", targetMode);
  }

  return NextResponse.redirect(sanitizePublicUrl(tablesUrl.toString(), req));
}
