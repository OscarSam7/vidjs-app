import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Sesión expirada");
    }

    const songRequest = await prisma.songRequest.findUnique({
      where: { id },
    });

    if (!songRequest) {
      throw new NotFoundError("Solicitud no encontrada");
    }

    // Verificar que la solicitud pertenezca a la misma mesa y evento
    if (
      songRequest.tableId !== guestSession.tableId ||
      songRequest.eventId !== guestSession.eventId
    ) {
      throw new ForbiddenError("No puedes cancelar solicitudes de otra mesa");
    }

    // Solo se puede cancelar si sigue en estado PENDING
    if (songRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          error: {
            code: "CANNOT_CANCEL",
            message: "La canción ya fue aceptada o reproducida por el DJ y no se puede cancelar",
          },
        },
        { status: 400 }
      );
    }

    await prisma.songRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      message: "Solicitud cancelada exitosamente",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
