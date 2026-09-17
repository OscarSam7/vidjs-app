import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { setGuestSessionCookie } from "@/lib/auth/guest-session";

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

  // 3. Crear nueva sesión de invitado segura
  const sessionToken = `gs_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 12); // Válida por 12 horas

  await prisma.guestSession.create({
    data: {
      tenantId: table.tenantId,
      eventId: activeEvent.id,
      tableId: table.id,
      sessionToken,
      expiresAt,
    },
  });

  // 4. Guardar cookie segura y redirigir a la web app del comensal
  await setGuestSessionCookie(sessionToken);

  return NextResponse.redirect(`${baseUrl}/guest`);
}
