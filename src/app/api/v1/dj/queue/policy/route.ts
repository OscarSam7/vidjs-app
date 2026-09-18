import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { parseQueuePolicy, QueuePolicy } from "@/lib/dj/rotation";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const updatePolicySchema = z.object({
  eventId: z.string().min(1, "eventId es obligatorio"),
  maxActivePerTable: z.number().int().min(1).max(99).optional(),
  queuePaused: z.boolean().optional(),
  rotationMode: z.enum(["ROUND_ROBIN", "FIFO"]).optional(),
  zone: z.enum(["DJ", "KARAOKE", "MAIN"]).optional(),
  avgSongDurationMinutes: z.number().int().min(1).max(15).optional(),
  photosAllowed: z.boolean().optional(),
  photoRotationSeconds: z.number().int().min(3).max(60).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      throw new AppError("Parámetro eventId es obligatorio", 400);
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, settings: true, venue: { select: { name: true } } },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    const policy = parseQueuePolicy(event.settings);

    return NextResponse.json({
      success: true,
      data: {
        eventId: event.id,
        eventName: event.name,
        venueName: event.venue.name,
        policy,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();

    const body = await req.json();
    const data = updatePolicySchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: data.eventId, tenantId },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    const currentPolicy = parseQueuePolicy(event.settings);

    const updatedPolicy: QueuePolicy = {
      ...currentPolicy,
      ...(data.maxActivePerTable !== undefined && { maxActivePerTable: data.maxActivePerTable }),
      ...(data.queuePaused !== undefined && { queuePaused: data.queuePaused }),
      ...(data.rotationMode !== undefined && { rotationMode: data.rotationMode }),
      ...(data.zone !== undefined && { zone: data.zone }),
      ...(data.avgSongDurationMinutes !== undefined && { avgSongDurationMinutes: data.avgSongDurationMinutes }),
      ...(data.photosAllowed !== undefined && { photosAllowed: data.photosAllowed }),
      ...(data.photoRotationSeconds !== undefined && { photoRotationSeconds: data.photoRotationSeconds }),
    };

    // Combinar con otras configuraciones existentes del evento si las hubiera
    let existingSettings: Record<string, unknown> = {};
    try {
      if (event.settings) existingSettings = JSON.parse(event.settings);
    } catch {
      existingSettings = {};
    }

    const mergedSettings = JSON.stringify({
      ...existingSettings,
      ...updatedPolicy,
    });

    await prisma.event.update({
      where: { id: event.id },
      data: { settings: mergedSettings },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "DJ_QUEUE_POLICY_UPDATED",
        resource: "EVENT_POLICY",
        resourceId: event.id,
        metadata: JSON.stringify(updatedPolicy),
      },
    });

    // Notificar en tiempo real por SSE a todos los comensales, cabinas y pantallas
    realtimeBus.broadcast(event.id, "QUEUE_POLICY_UPDATED", {
      eventId: event.id,
      policy: updatedPolicy,
    });

    return NextResponse.json({
      success: true,
      message: "Política de cola actualizada exitosamente",
      data: updatedPolicy,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
