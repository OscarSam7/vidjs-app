import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";
import { sendAccreditationEmail } from "@/lib/email/accreditation-email";
import { getRequestOrigin } from "@/lib/url";

const emailDispatchSchema = z.object({
  eventId: z.string().min(1, "El ID del evento es requerido"),
  participantIds: z.array(z.string()).min(1, "Debe seleccionar al menos un participante"),
});

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requirePermission("accreditations:manage");
    const body = await req.json();
    const { eventId, participantIds } = emailDispatchSchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: eventId, ...(tenantId ? { tenantId } : {}) },
      include: { venue: true },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado o sin permisos");
    }

    const participants = await prisma.eventParticipant.findMany({
      where: {
        id: { in: participantIds },
        eventId,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        accreditation: true,
        accreditationType: true,
      },
    });

    if (!participants.length) {
      throw new BadRequestError("No se encontraron participantes válidos para este evento");
    }

    const origin = getRequestOrigin(req);
    const results = {
      total: participants.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{ id: string; name: string; email: string | null; status: "SENT" | "SKIPPED" | "FAILED"; message?: string }>,
    };

    for (const p of participants) {
      const acc = p.accreditation;
      if (!p.email || !p.email.includes("@")) {
        results.skipped++;
        results.details.push({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`.trim(),
          email: p.email,
          status: "SKIPPED",
          message: "No posee dirección de correo electrónico registrada",
        });
        continue;
      }

      if (!acc) {
        results.skipped++;
        results.details.push({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`.trim(),
          email: p.email,
          status: "SKIPPED",
          message: "Participante sin credencial emitida",
        });
        continue;
      }

      const qrPayload = JSON.stringify({
        t: acc.qrToken,
        e: event.code,
        c: acc.codeNumber,
        s: acc.qrSignature,
      });

      const publicUrl = `${origin}/accreditation/${event.code}/register?doc=${encodeURIComponent(p.documentNumber || "")}`;

      const res = await sendAccreditationEmail({
        recipientEmail: p.email,
        recipientName: `${p.firstName} ${p.lastName}`.trim(),
        eventTitle: event.name,
        eventCode: event.code,
        venueName: event.venue?.name,
        venueAddress: event.venue?.address,
        startsAt: event.startsAt,
        categoryName: p.accreditationType?.name || "Participante",
        categoryColor: p.accreditationType?.colorHex || "#8B5CF6",
        codeNumber: acc.codeNumber,
        qrPayload,
        publicUrl,
      });

      if (res.success) {
        results.sent++;
        results.details.push({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`.trim(),
          email: p.email,
          status: "SENT",
        });
      } else {
        results.failed++;
        results.details.push({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`.trim(),
          email: p.email,
          status: "FAILED",
          message: res.error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Despacho completado: ${results.sent} enviados, ${results.skipped} omitidos, ${results.failed} con error.`,
      data: results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
