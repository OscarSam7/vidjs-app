import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { sanitizeText } from "@/lib/security/sanitize";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      tenantId: rawTenantId,
      venueId: rawVenueId,
      tableId: rawTableId,
      tableNumber: rawTableNumber,
      tableName: rawTableName,
      guestSessionId: rawGuestSessionId,
      type = "COMPLAINT",
      rating,
      category = "SERVICE",
      subject,
      comment,
      isAnonymous = true,
      customerName,
      customerPhone,
    } = body;

    if (!comment || typeof comment !== "string" || comment.trim().length < 3) {
      return NextResponse.json(
        { error: "Por favor escribe un mensaje o detalle de al menos 3 caracteres." },
        { status: 400 }
      );
    }

    if (comment.length > 2000) {
      return NextResponse.json(
        { error: "El mensaje no puede exceder los 2000 caracteres." },
        { status: 400 }
      );
    }

    // 1. Resolver Tenant ID si no vino directo
    let resolvedTenantId = rawTenantId ? String(rawTenantId).trim() : null;
    let resolvedVenueId = rawVenueId ? String(rawVenueId).trim() : null;
    let resolvedTableId = rawTableId ? String(rawTableId).trim() : null;
    let resolvedTableNumber = rawTableNumber ? String(rawTableNumber).trim() : null;
    let resolvedTableName = rawTableName ? String(rawTableName).trim() : null;
    let resolvedGuestSessionId = rawGuestSessionId ? String(rawGuestSessionId).trim() : null;

    // Si hay guestSessionId o cookie de sesión, recuperar datos de mesa y tenant
    if (resolvedGuestSessionId && !resolvedTenantId) {
      const gSession = await prisma.guestSession.findUnique({
        where: { id: resolvedGuestSessionId },
        include: { table: true, event: true },
      });
      if (gSession) {
        resolvedTenantId = gSession.tenantId;
        resolvedTableId = gSession.tableId || resolvedTableId;
        if (gSession.table) {
          resolvedTableNumber = String(gSession.table.number);
          resolvedTableName = gSession.table.label || `Mesa ${gSession.table.number}`;
          resolvedVenueId = gSession.table.venueId || resolvedVenueId;
        }
      }
    }

    // Si aún no tenemos tenantId, intentar buscar el primer tenant activo del sistema
    if (!resolvedTenantId) {
      const activeTenant = await prisma.tenant.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      resolvedTenantId = activeTenant?.id || null;
    }

    if (!resolvedTenantId) {
      return NextResponse.json(
        { error: "No se pudo vincular el mensaje al establecimiento." },
        { status: 400 }
      );
    }

    // 2. Normalizar tipo, categoría y estrellas
    const validTypes = ["COMPLAINT", "CLAIM", "SUGGESTION", "COMPLIMENT"];
    const normalizedType = validTypes.includes(type) ? type : "COMPLAINT";

    const validCategories = ["BAR", "KITCHEN", "SERVICE", "MUSIC", "FACILITIES", "BILLING", "OTHER"];
    const normalizedCategory = validCategories.includes(category) ? category : "SERVICE";

    const parsedRating = typeof rating === "number" && rating >= 1 && rating <= 5 ? Math.round(rating) : null;

    // 3. Determinar Prioridad Automática:
    // Queja urgente en vivo o calificación <= 2 estrellas = URGENT
    // Reclamo de cuenta / servicio = HIGH
    // Felicitación / Sugerencia = MEDIUM o LOW
    let priority = "MEDIUM";
    if (normalizedType === "COMPLAINT" || (parsedRating !== null && parsedRating <= 2)) {
      priority = "URGENT";
    } else if (normalizedType === "CLAIM") {
      priority = "HIGH";
    } else if (normalizedType === "COMPLIMENT") {
      priority = "LOW";
    }

    // 4. Crear Ticket QSR
    const ticket = await prisma.qsrTicket.create({
      data: {
        tenantId: resolvedTenantId,
        venueId: resolvedVenueId,
        tableId: resolvedTableId,
        tableNumber: resolvedTableNumber,
        tableName: resolvedTableName,
        guestSessionId: resolvedGuestSessionId,
        type: normalizedType,
        priority,
        rating: parsedRating,
        category: normalizedCategory,
        subject: subject ? sanitizeText(subject).slice(0, 150) : null,
        comment: sanitizeText(comment),
        isAnonymous: Boolean(isAnonymous),
        customerName: !isAnonymous && customerName ? sanitizeText(customerName).slice(0, 100) : null,
        customerPhone: !isAnonymous && customerPhone ? sanitizeText(customerPhone).slice(0, 40) : null,
        status: "PENDING",
      },
    });

    // 5. Difusión en tiempo real hacia los dashboards de Gerencia & Dueño (SSE)
    try {
      realtimeBus.broadcast(resolvedTenantId, "QSR_NEW_TICKET" as any, {
        id: ticket.id,
        type: ticket.type,
        priority: ticket.priority,
        category: ticket.category,
        tableNumber: ticket.tableNumber,
        rating: ticket.rating,
        createdAt: ticket.createdAt,
      });

      if (ticket.priority === "URGENT") {
        realtimeBus.broadcast(resolvedTenantId, "QSR_URGENT_ALERT" as any, {
          id: ticket.id,
          message: `🚨 Queja urgente en Mesa ${ticket.tableNumber || "S/M"}: ${ticket.comment.slice(0, 60)}...`,
          tableNumber: ticket.tableNumber,
        });
      }
    } catch (e) {
      console.warn("[QSR] Error emitiendo alerta SSE:", e);
    }

    return NextResponse.json({
      ok: true,
      ticketId: ticket.id,
      priority: ticket.priority,
      message: "Tu mensaje ha sido recibido de forma confidencial por la Gerencia y Dueño.",
    });
  } catch (error) {
    console.error("[QSR POST GUEST ERROR]", error);
    return NextResponse.json(
      { error: "Ocurrió un error al enviar tu mensaje. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
