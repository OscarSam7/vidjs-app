import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, BadRequestError } from "@/lib/errors";
import { verifyAccreditationSignature } from "@/lib/accreditation/token";
import { eventBus } from "@/lib/realtime/event-bus";

const checkInSchema = z.object({
  eventId: z.string().min(1, "El ID del evento es obligatorio"),
  qrToken: z.string().min(1, "El token QR es obligatorio"),
  accessPointId: z.string().optional().nullable(),
  direction: z.enum(["IN", "OUT"]).default("IN"),
  operatorName: z.string().optional().nullable(),
  deviceIdentifier: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { tenantId, session } = await requireTenantContext();
    await requirePermission("accreditations:checkin");

    const body = await req.json();
    const parsed = checkInSchema.parse(body);

    const operatorName = parsed.operatorName || session.name || session.email;

    // 1. Find Accreditation by qrToken
    const accreditation = await prisma.eventAccreditation.findFirst({
      where: {
        qrToken: parsed.qrToken,
        tenantId,
      },
      include: {
        participant: true,
        accreditationType: true,
        event: {
          select: { id: true, name: true, code: true, status: true },
        },
      },
    });

    // If QR not found in database: Invalid QR
    if (!accreditation) {
      // Record unlinked rejected scan attempt if door is known
      return NextResponse.json(
        {
          success: false,
          status: "REJECTED",
          rejectionReason: "INVALID_QR",
          message: "Código QR inexistente o no reconocido por el sistema",
        },
        { status: 404 }
      );
    }

    const { participant, accreditationType, event } = accreditation;

    // 2. Verify event match
    if (accreditation.eventId !== parsed.eventId) {
      await prisma.checkInRecord.create({
        data: {
          tenantId,
          eventId: parsed.eventId,
          accreditationId: accreditation.id,
          participantId: participant.id,
          accessPointId: parsed.accessPointId || null,
          direction: parsed.direction,
          status: "REJECTED",
          rejectionReason: "WRONG_EVENT",
          operatorId: session.sub,
          operatorName,
          deviceIdentifier: parsed.deviceIdentifier,
        },
      });

      return NextResponse.json({
        success: false,
        status: "REJECTED",
        rejectionReason: "WRONG_EVENT",
        message: `Esta credencial pertenece a otro evento (${event.name})`,
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
          company: participant.company,
        },
      });
    }

    // 3. Cryptographic Anti-Counterfeit Signature Verification (HMAC-SHA256)
    const isAuthentic = verifyAccreditationSignature(
      accreditation.qrToken,
      accreditation.eventId,
      accreditation.participantId,
      accreditation.qrSignature
    );

    if (!isAuthentic) {
      await prisma.checkInRecord.create({
        data: {
          tenantId,
          eventId: parsed.eventId,
          accreditationId: accreditation.id,
          participantId: participant.id,
          accessPointId: parsed.accessPointId || null,
          direction: parsed.direction,
          status: "REJECTED",
          rejectionReason: "FORGED_SIGNATURE",
          operatorId: session.sub,
          operatorName,
          deviceIdentifier: parsed.deviceIdentifier,
        },
      });

      return NextResponse.json({
        success: false,
        status: "REJECTED",
        rejectionReason: "FORGED_SIGNATURE",
        message: "¡ALERTA DE SEGURIDAD! Firma digital de credencial inválida o adulterada",
      });
    }

    // 4. Verify status (BLOCKED / CANCELLED / REJECTED)
    if (accreditation.status === "BLOCKED" || accreditation.status === "CANCELLED" || accreditation.status === "REJECTED") {
      await prisma.checkInRecord.create({
        data: {
          tenantId,
          eventId: parsed.eventId,
          accreditationId: accreditation.id,
          participantId: participant.id,
          accessPointId: parsed.accessPointId || null,
          direction: parsed.direction,
          status: "REJECTED",
          rejectionReason: accreditation.status,
          operatorId: session.sub,
          operatorName,
          deviceIdentifier: parsed.deviceIdentifier,
        },
      });

      return NextResponse.json({
        success: false,
        status: "REJECTED",
        rejectionReason: accreditation.status,
        message: `Acceso denegado: La credencial se encuentra en estado ${accreditation.status}`,
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
          documentNumber: participant.documentNumber,
          category: accreditationType.name,
          colorHex: accreditationType.colorHex,
        },
      });
    }

    // 5. Check Gate / Sector authorization matrix
    if (parsed.accessPointId) {
      const rule = await prisma.accessPointRule.findUnique({
        where: {
          accessPointId_accreditationTypeId: {
            accessPointId: parsed.accessPointId,
            accreditationTypeId: accreditation.accreditationTypeId,
          },
        },
      });

      // If rule exists and explicitly denies
      if (rule && !rule.isAllowed) {
        await prisma.checkInRecord.create({
          data: {
            tenantId,
            eventId: parsed.eventId,
            accreditationId: accreditation.id,
            participantId: participant.id,
            accessPointId: parsed.accessPointId,
            direction: parsed.direction,
            status: "REJECTED",
            rejectionReason: "INVALID_SECTOR",
            operatorId: session.sub,
            operatorName,
            deviceIdentifier: parsed.deviceIdentifier,
          },
        });

        return NextResponse.json({
          success: false,
          status: "REJECTED",
          rejectionReason: "INVALID_SECTOR",
          message: `Sector restringido: La categoría "${accreditationType.name}" no está autorizada para esta puerta`,
          participant: {
            firstName: participant.firstName,
            lastName: participant.lastName,
            category: accreditationType.name,
            colorHex: accreditationType.colorHex,
          },
        });
      }
    }

    // 6. Check Time Schedule restrictions
    if (accreditationType.allowedStartTime || accreditationType.allowedEndTime) {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, "0");
      const currentMins = now.getMinutes().toString().padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMins}`;

      if (
        (accreditationType.allowedStartTime && currentTimeStr < accreditationType.allowedStartTime) ||
        (accreditationType.allowedEndTime && currentTimeStr > accreditationType.allowedEndTime)
      ) {
        await prisma.checkInRecord.create({
          data: {
            tenantId,
            eventId: parsed.eventId,
            accreditationId: accreditation.id,
            participantId: participant.id,
            accessPointId: parsed.accessPointId || null,
            direction: parsed.direction,
            status: "REJECTED",
            rejectionReason: "OUT_OF_SCHEDULE",
            operatorId: session.sub,
            operatorName,
            deviceIdentifier: parsed.deviceIdentifier,
          },
        });

        return NextResponse.json({
          success: false,
          status: "REJECTED",
          rejectionReason: "OUT_OF_SCHEDULE",
          message: `Horario no permitido: Acceso habilitado únicamente de ${accreditationType.allowedStartTime || "00:00"} a ${accreditationType.allowedEndTime || "23:59"}`,
          participant: {
            firstName: participant.firstName,
            lastName: participant.lastName,
            category: accreditationType.name,
            colorHex: accreditationType.colorHex,
          },
        });
      }
    }

    // 7. Check Duplicate / Re-entry restrictions
    if (!accreditationType.allowReentry && accreditation.totalCheckIns > 0 && parsed.direction === "IN") {
      await prisma.checkInRecord.create({
        data: {
          tenantId,
          eventId: parsed.eventId,
          accreditationId: accreditation.id,
          participantId: participant.id,
          accessPointId: parsed.accessPointId || null,
          direction: parsed.direction,
          status: "DUPLICATE",
          rejectionReason: "ALREADY_CHECKED_IN",
          operatorId: session.sub,
          operatorName,
          deviceIdentifier: parsed.deviceIdentifier,
        },
      });

      return NextResponse.json({
        success: false,
        status: "DUPLICATE",
        rejectionReason: "ALREADY_CHECKED_IN",
        message: `¡ATENCIÓN! El participante ya ingresó previamente a las ${accreditation.lastCheckInAt ? new Date(accreditation.lastCheckInAt).toLocaleTimeString("es-PY") : ""} (No permite reingreso)`,
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
          documentNumber: participant.documentNumber,
          category: accreditationType.name,
          colorHex: accreditationType.colorHex,
          company: participant.company,
          firstCheckInAt: accreditation.firstCheckInAt,
          totalCheckIns: accreditation.totalCheckIns,
        },
      });
    }

    // 8. ACCESS APPROVED: Record CheckIn
    const now = new Date();
    const checkInRecord = await prisma.checkInRecord.create({
      data: {
        tenantId,
        eventId: parsed.eventId,
        accreditationId: accreditation.id,
        participantId: participant.id,
        accessPointId: parsed.accessPointId || null,
        direction: parsed.direction,
        status: "APPROVED",
        scannedAt: now,
        operatorId: session.sub,
        operatorName,
        deviceIdentifier: parsed.deviceIdentifier,
      },
      include: {
        accessPoint: { select: { id: true, name: true, code: true } },
      },
    });

    // Update Accreditation
    await prisma.eventAccreditation.update({
      where: { id: accreditation.id },
      data: {
        status: "CHECKED_IN",
        firstCheckInAt: accreditation.firstCheckInAt || now,
        lastCheckInAt: now,
        totalCheckIns: { increment: 1 },
      },
    });

    // Emit Realtime Event to update live dashboards and operator screens
    eventBus.emit("CHECKIN_RECORDED", {
      tenantId,
      eventId: parsed.eventId,
      participantId: participant.id,
      participantName: `${participant.firstName} ${participant.lastName}`,
      categoryName: accreditationType.name,
      colorHex: accreditationType.colorHex,
      accessPointName: checkInRecord.accessPoint?.name || "Puerta Principal",
      scannedAt: now.toISOString(),
      status: "APPROVED",
    });

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      message: "Acceso autorizado",
      scannedAt: now.toISOString(),
      participant: {
        id: participant.id,
        firstName: participant.firstName,
        lastName: participant.lastName,
        documentNumber: participant.documentNumber,
        documentType: participant.documentType,
        company: participant.company,
        jobTitle: participant.jobTitle,
        photoUrl: participant.photoUrl,
        category: accreditationType.name,
        categoryCode: accreditationType.code,
        colorHex: accreditationType.colorHex,
        codeNumber: accreditation.codeNumber,
        totalCheckIns: accreditation.totalCheckIns + 1,
      },
      accessPoint: checkInRecord.accessPoint,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
