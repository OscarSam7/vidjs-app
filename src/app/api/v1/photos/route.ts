import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, ForbiddenError, BadRequestError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { parseQueuePolicy } from "@/lib/dj/rotation";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { sanitizeText, validateBase64Image } from "@/lib/security/sanitize";

const createPhotoSchema = z.object({
  imageUrl: z.string().min(10, "La imagen es requerida"),
  caption: z.string().max(300).optional().nullable(),
  guestName: z.string().max(80).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const guestSession = await getCurrentGuestSession();
    let tenantId: string;
    let eventId: string;
    let tableId: string;
    let defaultGuestName: string;
    let rateLimitKey: string;

    if (guestSession) {
      tenantId = guestSession.tenantId;
      eventId = guestSession.eventId;
      tableId = guestSession.tableId;
      defaultGuestName = guestSession.guestName || guestSession.table?.label || "Mesa";
      rateLimitKey = `photo:table:${tableId}`;
    } else {
      // Personal del local (DJ, Staff)
      const staffSession = await getCurrentSession();
      if (!staffSession || !staffSession.tenantId) {
        throw new UnauthorizedError("Debes escanear el QR de tu mesa para subir fotos al muro de la pantalla.");
      }
      tenantId = staffSession.tenantId;
      const activeEvent = await prisma.event.findFirst({
        where: { tenantId, status: "ACTIVE" },
        include: { venue: { include: { tables: { take: 1 } } } },
      });
      if (!activeEvent || !activeEvent.venue.tables[0]) {
        throw new BadRequestError("No hay evento activo o mesas registradas en este local.");
      }
      eventId = activeEvent.id;
      tableId = activeEvent.venue.tables[0].id;
      defaultGuestName = staffSession.name || "Cabina DJ";
      rateLimitKey = `photo:staff:${staffSession.sub}`;
    }

    // 1. Rate Limiting: Máximo 5 fotos cada 2 minutos por mesa/usuario y por IP
    const tableLimit = rateLimit(rateLimitKey, 5, 2 * 60 * 1000);
    const ipLimit = rateLimit(`photo:ip:${ip}`, 10, 2 * 60 * 1000);

    if (!tableLimit.success || !ipLimit.success) {
      const retryAfter = Math.max(tableLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
      return NextResponse.json(
        {
          success: false,
          error: "Has alcanzado el límite temporal de subida de fotos. Por favor espera antes de enviar otra.",
          retryAfterSeconds: retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { settings: true },
    });

    const policy = parseQueuePolicy(event?.settings);
    if (!policy.photosAllowed) {
      throw new ForbiddenError("La subida de fotos al muro está pausada momentáneamente por la cabina del DJ.");
    }

    const body = await req.json();
    const data = createPhotoSchema.parse(body);

    // 2. Validación estricta de archivo/imagen (rechaza SVG, HTML incrustado y limita a 3MB JPEG/PNG/WebP)
    const imageValidation = validateBase64Image(data.imageUrl, 3 * 1024 * 1024);
    if (!imageValidation.valid) {
      throw new BadRequestError(imageValidation.error || "Archivo de imagen inválido o no permitido.");
    }

    // 3. Sanitización de textos para prevenir ataques XSS
    const sanitizedCaption = data.caption ? sanitizeText(data.caption) : null;
    const sanitizedGuestName = data.guestName ? sanitizeText(data.guestName) : defaultGuestName;

    // Si el modo Auto-Play está activo, las fotos se aprueban automáticamente y se proyectan en pantalla
    const isAutoPlay = Boolean(policy.autoPlayRequests);
    const initialPhotoStatus = isAutoPlay ? "APPROVED" : "PENDING";

    // 4. Inserción segura con aislamiento de tenant y mesa
    const post = await prisma.photoPost.create({
      data: {
        tenantId,
        eventId,
        tableId,
        guestName: sanitizedGuestName || defaultGuestName,
        imageUrl: data.imageUrl,
        caption: sanitizedCaption,
        status: initialPhotoStatus,
      },
      include: {
        table: { select: { label: true, number: true } },
      },
    });

    // Notificar a la cabina del DJ en tiempo real
    realtimeBus.broadcast(eventId, "PHOTO_NEW", post);

    if (isAutoPlay) {
      // Proyectar directamente en la pantalla de TV en tiempo real
      realtimeBus.broadcast(eventId, "PHOTO_APPROVED", post);
      realtimeBus.broadcast(eventId, "PHOTO_FEATURED", {
        photo: post,
        durationSeconds: 15,
      });
    }

    return NextResponse.json({
      success: true,
      message: isAutoPlay
        ? "🎉 ¡Foto aprobada y proyectándose en vivo en la pantalla grande!"
        : "¡Foto enviada a la cabina para proyectar en pantalla!",
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
    const statusParam = searchParams.get("status");

    let eventId = eventIdParam ? sanitizeText(eventIdParam) : null;

    if (!eventId && eventCodeParam) {
      const sanitizedCode = sanitizeText(eventCodeParam);
      const event = await prisma.event.findUnique({
        where: { code: sanitizedCode },
        select: { id: true },
      });
      if (event) eventId = event.id;
    }

    const session = await getCurrentSession();
    const isStaff = session && ["DJ", "MANAGER", "OWNER", "SUPER_ADMIN"].includes(session.role);

    const whereClause: any = {};
    if (eventId) whereClause.eventId = eventId;

    if (isStaff && statusParam) {
      const sanitizedStatus = sanitizeText(statusParam).toUpperCase();
      if (["PENDING", "APPROVED", "REJECTED"].includes(sanitizedStatus)) {
        whereClause.status = sanitizedStatus;
      }
    } else if (!isStaff) {
      // Comensales y público solo pueden ver fotos aprobadas
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
