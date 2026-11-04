import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const verifySchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CANCEL"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tenantId, session } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const data = verifySchema.parse(body);

    const reservation = await prisma.tableReservation.findFirst({
      where: { id, tenantId },
      include: {
        table: true,
        venue: true,
        package: true,
      },
    });

    if (!reservation) {
      throw new NotFoundError("Reserva no encontrada");
    }

    let updatedPaymentStatus = reservation.paymentStatus;
    let updatedStatus = reservation.status;

    if (data.action === "APPROVE") {
      updatedPaymentStatus = "APPROVED";
      updatedStatus = "CONFIRMED";
    } else if (data.action === "REJECT") {
      updatedPaymentStatus = "REJECTED";
    } else if (data.action === "CANCEL") {
      updatedStatus = "CANCELLED";
    }

    const updated = await prisma.tableReservation.update({
      where: { id },
      data: {
        paymentStatus: updatedPaymentStatus,
        status: updatedStatus,
        verifiedByUserId: session.sub,
        verifiedAt: new Date(),
        specialNotes: data.reason
          ? `${reservation.specialNotes || ""}\n[Auditoría]: ${data.reason}`.trim()
          : reservation.specialNotes,
      },
      include: {
        package: true,
        decoration: true,
        table: true,
      },
    });

    realtimeBus.emit("reservation:updated", {
      reservationId: id,
      tenantId,
      action: data.action,
      paymentStatus: updatedPaymentStatus,
    });

    return NextResponse.json({
      success: true,
      message:
        data.action === "APPROVE"
          ? "Pago aprobado exitosamente"
          : data.action === "REJECT"
          ? "Pago rechazado"
          : "Reserva cancelada",
      reservation: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
