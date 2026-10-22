import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, requireTenantContext } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

// DELETE /api/v1/photos/[id]: Eliminar permanentemente una foto subida por un cliente
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();
    const { id } = await params;

    const post = await prisma.photoPost.findFirst({
      where: { id, tenantId },
    });

    if (!post) {
      throw new NotFoundError("Foto no encontrada o no pertenece a este establecimiento");
    }

    await prisma.photoPost.delete({
      where: { id },
    });

    // Notificar inmediatamente a la pantalla Smart TV y paneles para quitarla
    realtimeBus.broadcast(post.eventId, "PHOTO_REMOVED", { id, eventId: post.eventId });

    return NextResponse.json({
      success: true,
      message: "Foto eliminada permanentemente de la base de datos.",
      data: { id, deleted: true },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
