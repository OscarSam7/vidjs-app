import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireTenantContext } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const photoActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
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
    });

    if (!post) {
      throw new NotFoundError("Foto no encontrada o no pertenece a este establecimiento");
    }

    const updated = await prisma.photoPost.update({
      where: { id },
      data: {
        status: data.action === "APPROVE" ? "APPROVED" : "REJECTED",
      },
    });

    // Notificar inmediatamente a la pantalla Smart TV y móviles
    realtimeBus.broadcast(
      post.eventId,
      data.action === "APPROVE" ? "PHOTO_APPROVED" : "PHOTO_REJECTED",
      updated
    );

    return NextResponse.json({
      success: true,
      message:
        data.action === "APPROVE"
          ? "¡Foto aprobada para proyectar en pantalla!"
          : "Foto rechazada",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
