import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireTenantContext } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const photoActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REMOVE", "FEATURE"]),
  durationSeconds: z.number().int().min(5).max(60).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();
    const { id } = await params;

    const body = await req.json();
    const data = photoActionSchema.parse(body);

    const post = await prisma.photoPost.findFirst({
      where: { id, tenantId },
      include: {
        table: { select: { label: true, number: true } },
      },
    });

    if (!post) {
      throw new NotFoundError("Foto no encontrada o no pertenece a este establecimiento");
    }

    if (data.action === "FEATURE") {
      // Destacar foto en grande por N segundos en la Smart TV
      realtimeBus.broadcast(post.eventId, "PHOTO_FEATURED", {
        photo: post,
        durationSeconds: data.durationSeconds || 12,
      });

      return NextResponse.json({
        success: true,
        message: "¡Foto proyectándose destacada en pantalla gigante!",
        data: post,
      });
    }

    let newStatus: string;
    let eventType: "PHOTO_APPROVED" | "PHOTO_REJECTED" | "PHOTO_REMOVED";
    let message: string;

    if (data.action === "APPROVE") {
      newStatus = "APPROVED";
      eventType = "PHOTO_APPROVED";
      message = "¡Foto aprobada para proyectar en pantalla!";
    } else if (data.action === "REJECT") {
      newStatus = "REJECTED";
      eventType = "PHOTO_REJECTED";
      message = "Foto rechazada";
    } else {
      // REMOVE: Sacar de la rotación de la TV
      newStatus = "REMOVED";
      eventType = "PHOTO_REMOVED";
      message = "Foto retirada de la pantalla de TV";
    }

    const updated = await prisma.photoPost.update({
      where: { id },
      data: { status: newStatus },
      include: {
        table: { select: { label: true, number: true } },
      },
    });

    // Notificar inmediatamente a la pantalla Smart TV y móviles
    realtimeBus.broadcast(post.eventId, eventType, updated);

    return NextResponse.json({
      success: true,
      message,
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
