import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireTenantContext } from "@/lib/auth/session";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const interactiveActionSchema = z.object({
  action: z.enum(["START_APPLAUSE", "TICK_APPLAUSE", "END_APPLAUSE", "SPIN_ROULETTE"]),
  eventId: z.string().min(1, "eventId es obligatorio"),
  targetTableLabel: z.string().optional(),
  durationSeconds: z.number().int().min(5).max(60).optional(),
  prizeTitle: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = interactiveActionSchema.parse(body);

    if (data.action === "TICK_APPLAUSE") {
      // Cualquier comensal con sesión o DJ puede mandar aplausos
      const guestSession = await getCurrentGuestSession();
      const senderLabel = guestSession?.table?.label || "Público";

      realtimeBus.broadcast(data.eventId, "APPLAUSE_TICK", {
        tableLabel: senderLabel,
        guestName: guestSession?.guestName || null,
        timestamp: Date.now(),
      });

      return NextResponse.json({ success: true });
    }

    // Para iniciar/terminar aplausómetro o ruleta, se requiere rol de DJ o Staff
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();

    const event = await prisma.event.findFirst({
      where: { id: data.eventId, tenantId },
      include: {
        venue: {
          include: {
            tables: {
              where: { active: true },
              select: { id: true, number: true, label: true },
              orderBy: { number: "asc" },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado o no pertenece a tu cuenta");
    }

    if (data.action === "START_APPLAUSE") {
      const duration = data.durationSeconds || 15;
      const endsAt = new Date(Date.now() + duration * 1000).toISOString();

      realtimeBus.broadcast(event.id, "APPLAUSE_START", {
        targetTableLabel: data.targetTableLabel || "¡A TODOS LOS ARTISTAS!",
        durationSeconds: duration,
        endsAt,
      });

      return NextResponse.json({
        success: true,
        message: "¡Aplausómetro iniciado en la pantalla!",
        data: { targetTableLabel: data.targetTableLabel, durationSeconds: duration, endsAt },
      });
    }

    if (data.action === "END_APPLAUSE") {
      realtimeBus.broadcast(event.id, "APPLAUSE_END", {
        timestamp: Date.now(),
      });

      return NextResponse.json({
        success: true,
        message: "Aplausómetro finalizado",
      });
    }

    if (data.action === "SPIN_ROULETTE") {
      const venueTables = event.venue.tables;
      const tableLabels =
        venueTables.length > 0
          ? venueTables.map((t) => t.label)
          : ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6"];

      const winningIndex = Math.floor(Math.random() * tableLabels.length);
      const winner = tableLabels[winningIndex];
      const prize = data.prizeTitle || "¡Ronda de Shots / Trago Gratis en Barra! 🍹";

      const payload = {
        tables: tableLabels,
        winner,
        winningIndex,
        prize,
        spinDurationMs: 6000,
        timestamp: Date.now(),
      };

      realtimeBus.broadcast(event.id, "ROULETTE_SPIN", payload);

      return NextResponse.json({
        success: true,
        message: `¡Ruleta girando en la pantalla gigante! Ganadora: ${winner}`,
        data: payload,
      });
    }

    throw new AppError("Acción no reconocida", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
