import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { setGuestSessionCookie, getCurrentGuestSession } from "@/lib/auth/guest-session";
import { realtimeBus } from "@/lib/realtime/event-bus";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Buscar la mesa por token de QR
  const table = await prisma.table.findUnique({
    where: { qrToken: token },
    include: {
      venue: { select: { id: true, name: true, tenantId: true } },
      tenant: { select: { id: true, name: true, slug: true, status: true } },
    },
  });

  const baseUrl = new URL(req.url).origin;

  if (!table || !table.active) {
    return NextResponse.redirect(`${baseUrl}/guest?error=table_not_found`);
  }

  if (table.tenant.status !== "ACTIVE") {
    return NextResponse.redirect(`${baseUrl}/guest?error=tenant_inactive`);
  }

  // 2. Buscar evento activo en esta sede
  const activeEvent = await prisma.event.findFirst({
    where: {
      venueId: table.venueId,
      status: "ACTIVE",
    },
    orderBy: { startsAt: "desc" },
  });

  if (!activeEvent) {
    // Redirigir a vista informando que no hay evento activo
    return NextResponse.redirect(
      `${baseUrl}/guest?error=no_active_event&venue=${encodeURIComponent(
        table.venue.name
      )}&table=${encodeURIComponent(table.label)}`
    );
  }

  // 3. Revisar si el comensal ya tenía una sesión activa previa en otra mesa
  const prevSession = await getCurrentGuestSession().catch(() => null);
  let carriedGuestName: string | null = null;
  let switchType: string | null = null;
  let fromZone: string | null = null;

  if (prevSession && prevSession.tableId !== table.id) {
    carriedGuestName = prevSession.guestName;
    fromZone = prevSession.table.zone;

    // Detectar si cambió de zona o solo de mesa
    if (prevSession.table.zone !== table.zone) {
      switchType = "zone";
    } else {
      switchType = "table";
    }

    // Expirar la sesión anterior para liberar la mesa previa
    await prisma.guestSession.update({
      where: { id: prevSession.id },
      data: { expiresAt: new Date() },
    }).catch(() => null);

    // Notificar liberación de la mesa previa
    realtimeBus.broadcast(prevSession.eventId, "TABLE_RELEASED", {
      tableId: prevSession.tableId,
      tableLabel: prevSession.table.label,
      zone: prevSession.table.zone,
      reason: "GUEST_MOVED_TABLE",
      newTableLabel: table.label,
      newZone: table.zone,
    });
  }

  // 4. Crear nueva sesión de invitado segura
  const sessionToken = `gs_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 12); // Válida por 12 horas

  await prisma.guestSession.create({
    data: {
      tenantId: table.tenantId,
      eventId: activeEvent.id,
      tableId: table.id,
      guestName: carriedGuestName,
      sessionToken,
      expiresAt,
    },
  });

  // 5. Guardar cookie segura y redirigir a la web app del comensal
  await setGuestSessionCookie(sessionToken);

  const redirectUrl = new URL(`${baseUrl}/guest`);
  if (switchType) {
    redirectUrl.searchParams.set("switched", switchType);
    redirectUrl.searchParams.set("toZone", table.zone);
    redirectUrl.searchParams.set("table", table.label);
    if (fromZone) {
      redirectUrl.searchParams.set("fromZone", fromZone);
    }
  }

  return NextResponse.redirect(redirectUrl.toString());
}
