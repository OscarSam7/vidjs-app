import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { handleApiError, AppError } from "@/lib/errors";
import { createDuel, getActiveDuel, cancelDuel } from "@/lib/dj/duel-state";
import { realtimeBus } from "@/lib/realtime/event-bus";

const duelActionSchema = z.object({
  action: z.enum(["START", "CANCEL"]),
  eventId: z.string(),
  trackA: z
    .object({
      title: z.string(),
      artist: z.string(),
      tableLabel: z.string().optional(),
    })
    .optional(),
  trackB: z
    .object({
      title: z.string(),
      artist: z.string(),
      tableLabel: z.string().optional(),
    })
    .optional(),
  durationSeconds: z.number().int().min(15).max(180).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const body = await req.json();
    const data = duelActionSchema.parse(body);

    if (data.action === "START") {
      if (!data.trackA || !data.trackB) {
        throw new AppError("Debes especificar Track A y Track B para iniciar el duelo.", 400);
      }

      const duel = createDuel({
        eventId: data.eventId,
        trackA: data.trackA,
        trackB: data.trackB,
        durationSeconds: data.durationSeconds || 45,
      });

      // Notificar a Smart TV y móviles inmediatamente
      realtimeBus.broadcast(data.eventId, "DUEL_UPDATE", duel);

      return NextResponse.json({
        success: true,
        message: "¡Duelo musical iniciado!",
        data: duel,
      });
    }

    if (data.action === "CANCEL") {
      cancelDuel(data.eventId);
      // Notificar remoción inmediata del duelo
      realtimeBus.broadcast(data.eventId, "DUEL_UPDATE", null);

      return NextResponse.json({
        success: true,
        message: "Duelo cancelado.",
      });
    }

    throw new AppError("Acción no válida", 400);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      throw new AppError("Se requiere eventId", 400);
    }

    const duel = getActiveDuel(eventId);
    return NextResponse.json({
      success: true,
      data: duel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
