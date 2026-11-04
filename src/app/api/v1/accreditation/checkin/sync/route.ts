import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, BadRequestError } from "@/lib/errors";
import { eventBus } from "@/lib/realtime/event-bus";

const syncPayloadSchema = z.object({
  eventId: z.string().min(1, "El ID del evento es obligatorio"),
  records: z
    .array(
      z.object({
        localId: z.string().optional(),
        qrToken: z.string().min(1),
        accessPointId: z.string().optional().nullable(),
        direction: z.enum(["IN", "OUT"]).default("IN"),
        scannedAt: z.string(),
        operatorName: z.string().optional().nullable(),
        deviceIdentifier: z.string().optional().nullable(),
      })
    )
    .min(1, "Debe enviar al menos un registro de sincronización"),
});

export async function POST(req: NextRequest) {
  try {
    const { tenantId, session } = await requireTenantContext();
    await requirePermission("accreditations:checkin");

    const body = await req.json();
    const parsed = syncPayloadSchema.parse(body);

    let approvedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;

    const results: Array<{ localId?: string; status: string; message: string }> = [];

    // Sort records chronologically so they are applied in true order
    const sortedRecords = [...parsed.records].sort(
      (a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
    );

    const now = new Date();

    for (const item of sortedRecords) {
      const scanDate = new Date(item.scannedAt);
      const operatorName = item.operatorName || session.name || session.email;

      const accreditation = await prisma.eventAccreditation.findFirst({
        where: { qrToken: item.qrToken, tenantId },
        include: {
          participant: true,
          accreditationType: true,
        },
      });

      if (!accreditation) {
        rejectedCount++;
        results.push({
          localId: item.localId,
          status: "REJECTED",
          message: "Código QR inexistente",
        });
        continue;
      }

      const { participant, accreditationType } = accreditation;

      // Check if blocked or cancelled
      if (accreditation.status === "BLOCKED" || accreditation.status === "CANCELLED") {
        await prisma.checkInRecord.create({
          data: {
            tenantId,
            eventId: parsed.eventId,
            accreditationId: accreditation.id,
            participantId: participant.id,
            accessPointId: item.accessPointId || null,
            direction: item.direction,
            status: "REJECTED",
            rejectionReason: accreditation.status,
            scannedAt: scanDate,
            isOfflineRecord: true,
            syncedAt: now,
            operatorId: session.sub,
            operatorName,
            deviceIdentifier: item.deviceIdentifier,
            notes: "Sincronizado desde modo offline",
          },
        });
        rejectedCount++;
        results.push({
          localId: item.localId,
          status: "REJECTED",
          message: `Estado ${accreditation.status}`,
        });
        continue;
      }

      // Check if already checked in before this date and reentry not allowed
      if (!accreditationType.allowReentry && accreditation.totalCheckIns > 0) {
        await prisma.checkInRecord.create({
          data: {
            tenantId,
            eventId: parsed.eventId,
            accreditationId: accreditation.id,
            participantId: participant.id,
            accessPointId: item.accessPointId || null,
            direction: item.direction,
            status: "DUPLICATE",
            rejectionReason: "OFFLINE_DUPLICATE_CONFLICT",
            scannedAt: scanDate,
            isOfflineRecord: true,
            syncedAt: now,
            operatorId: session.sub,
            operatorName,
            deviceIdentifier: item.deviceIdentifier,
            notes: "Ingreso duplicado detectado durante sincronización offline",
          },
        });
        duplicateCount++;
        results.push({
          localId: item.localId,
          status: "DUPLICATE",
          message: "Conflicto: ya había ingresado previamente",
        });
        continue;
      }

      // Valid Offline Check-In: Commit to DB
      await prisma.checkInRecord.create({
        data: {
          tenantId,
          eventId: parsed.eventId,
          accreditationId: accreditation.id,
          participantId: participant.id,
          accessPointId: item.accessPointId || null,
          direction: item.direction,
          status: "APPROVED",
          scannedAt: scanDate,
          isOfflineRecord: true,
          syncedAt: now,
          operatorId: session.sub,
          operatorName,
          deviceIdentifier: item.deviceIdentifier,
          notes: "Ingreso validado offline y sincronizado exitosamente",
        },
      });

      await prisma.eventAccreditation.update({
        where: { id: accreditation.id },
        data: {
          status: "CHECKED_IN",
          firstCheckInAt: accreditation.firstCheckInAt || scanDate,
          lastCheckInAt: scanDate,
          totalCheckIns: { increment: 1 },
        },
      });

      approvedCount++;
      results.push({
        localId: item.localId,
        status: "APPROVED",
        message: "Sincronizado correctamente",
      });
    }

    return NextResponse.json({
      success: true,
      totalProcessed: sortedRecords.length,
      approvedCount,
      duplicateCount,
      rejectedCount,
      results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
