import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, AppError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const createPhotoSchema = z.object({
  imageUrl: z.string().min(10, "La imagen es requerida"),
  caption: z.string().max(160).optional(),
  guestName: z.string().max(60).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Debes escanear el QR de tu mesa para subir fotos al muro de la pantalla.");
    }

    const body = await req.json();
    const data = createPhotoSchema.parse(body);

    const post = await prisma.photoPost.create({
      data: {
        tenantId: guestSession.tenantId,
        eventId: guestSession.eventId,
        tableId: guestSession.tableId,
        guestName: data.guestName?.trim() || guestSession.guestName || "Mesa",
        imageUrl: data.imageUrl,
        caption: data.caption?.trim() || null,
        status: "PENDING", // Pasa a moderación del DJ
      },
      include: {
        table: { select: { label: true, number: true } },
      },
    });

    // Notificar a la cabina del DJ en tiempo real
    realtimeBus.broadcast(guestSession.eventId, "PHOTO_NEW", post);

    return NextResponse.json({
      success: true,
      message: "¡Foto enviada a la cabina para proyectar en pantalla!",
      data: post,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventIdParam = searchParams.get("eventId");
    const eventCodeParam = searchParams.get("code");
    const statusParam = searchParams.get("status"); // PENDING, APPROVED, etc.

    let eventId = eventIdParam;

    if (!eventId && eventCodeParam) {
      const event = await prisma.event.findUnique({
        where: { code: eventCodeParam },
        select: { id: true },
      });
      if (event) eventId = event.id;
    }

    const session = await getCurrentSession();
    const isStaff = session && ["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"].includes(session.role);

    const whereClause: any = {};
    if (eventId) whereClause.eventId = eventId;

    if (isStaff && statusParam) {
      whereClause.status = statusParam;
    } else if (!isStaff) {
      // Públicos y comensales solo ven fotos aprobadas
      whereClause.status = "APPROVED";
    }

    const photos = await prisma.photoPost.findMany({
      where: whereClause,
      include: {
        table: { select: { label: true, number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        photos,
        total: photos.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
