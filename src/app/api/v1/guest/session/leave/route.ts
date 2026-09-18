import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession, clearGuestSessionCookie } from "@/lib/auth/guest-session";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { handleApiError } from "@/lib/errors";

export async function POST() {
  try {
    const guestSession = await getCurrentGuestSession();

    if (!guestSession) {
      await clearGuestSessionCookie();
      return NextResponse.json({
        success: true,
        message: "No había sesión activa o ya había finalizado",
      });
    }

    const { id: sessionId, tableId, eventId, table } = guestSession;

    // 1. Cancelar solicitudes en cola pendientes o aceptadas de este cliente
    const cancelledRequests = await prisma.songRequest.updateMany({
      where: {
        tableId,
        eventId,
        guestSessionId: sessionId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      data: {
        status: "CANCELLED",
        notes: "Cliente liberó la mesa voluntariamente",
      },
    });

    // 2. Marcar la sesión como expirada inmediatamente
    await prisma.guestSession.update({
      where: { id: sessionId },
      data: {
        expiresAt: new Date(),
      },
    });

    // 3. Limpiar la cookie segura del comensal
    await clearGuestSessionCookie();

    // 4. Notificar a cabinas de DJ, pantallas y otros clientes vía Realtime Bus
    realtimeBus.broadcast(eventId, "TABLE_RELEASED", {
      tableId,
      tableLabel: table.label,
      zone: table.zone,
      cancelledCount: cancelledRequests.count,
      releasedAt: new Date().toISOString(),
    });

    realtimeBus.broadcast(eventId, "QUEUE_UPDATE", {
      reason: "TABLE_RELEASED",
      tableId,
    });

    realtimeBus.broadcast(eventId, "QUEUE_SLOT_UNLOCKED", {
      tableId,
      tableLabel: table.label,
      reason: "GUEST_CHECKOUT",
    });

    return NextResponse.json({
      success: true,
      message: `Mesa ${table.label} liberada con éxito. Esperamos volver a verte pronto.`,
      data: {
        tableLabel: table.label,
        cancelledCount: cancelledRequests.count,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
