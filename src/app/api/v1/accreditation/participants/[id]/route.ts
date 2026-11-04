import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";

const updateParticipantSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  documentNumber: z.string().min(1).optional(),
  documentType: z.enum(["CI", "PASSPORT", "DNI", "RUC"]).optional(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  country: z.string().optional(),
  city: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  accreditationTypeId: z.string().optional(),
  organizationId: z.string().optional().nullable(),
  isSpecialGuest: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  status: z
    .enum(["PENDING", "APPROVED", "ACCREDITED", "CHECKED_IN", "REJECTED", "CANCELLED", "BLOCKED"])
    .optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    const { id } = await params;

    const participant = await prisma.eventParticipant.findFirst({
      where: { id, tenantId },
      include: {
        accreditationType: true,
        organization: true,
        accreditation: {
          include: {
            checkInRecords: {
              orderBy: { scannedAt: "desc" },
              include: {
                accessPoint: {
                  select: { id: true, name: true, code: true, sectorType: true },
                },
              },
            },
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundError("Participante no encontrado");
    }

    return NextResponse.json({ success: true, participant });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");
    const { id } = await params;

    const existing = await prisma.eventParticipant.findFirst({
      where: { id, tenantId },
      include: { accreditation: true },
    });

    if (!existing) {
      throw new NotFoundError("Participante no encontrado");
    }

    const body = await req.json();
    const parsed = updateParticipantSchema.parse(body);

    // If document is changed, verify uniqueness
    if (parsed.documentNumber && parsed.documentNumber !== existing.documentNumber) {
      const cleanDoc = parsed.documentNumber.trim().toUpperCase();
      const duplicate = await prisma.eventParticipant.findUnique({
        where: {
          eventId_documentNumber: {
            eventId: existing.eventId,
            documentNumber: cleanDoc,
          },
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestError(`Ya existe otro participante con el documento '${cleanDoc}'`);
      }
    }

    const { status, ...participantFields } = parsed;

    const updatedParticipant = await prisma.eventParticipant.update({
      where: { id },
      data: participantFields,
    });

    // Update accreditation if status or category changed
    if (existing.accreditation && (status || parsed.accreditationTypeId)) {
      const accUpdateData: any = {};
      if (status) {
        accUpdateData.status = status;
        if (status === "ACCREDITED" && !existing.accreditation.accreditedAt) {
          accUpdateData.accreditedAt = new Date();
        }
      }
      if (parsed.accreditationTypeId) {
        accUpdateData.accreditationTypeId = parsed.accreditationTypeId;
      }

      await prisma.eventAccreditation.update({
        where: { id: existing.accreditation.id },
        data: accUpdateData,
      });
    }

    return NextResponse.json({ success: true, participant: updatedParticipant });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");
    const { id } = await params;

    const existing = await prisma.eventParticipant.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { checkInRecords: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError("Participante no encontrado");
    }

    if (existing._count.checkInRecords > 0) {
      throw new BadRequestError(
        `No se puede eliminar un participante que ya tiene ${existing._count.checkInRecords} ingresos registrados en puerta. Puedes bloquear o cancelar su acreditación.`
      );
    }

    await prisma.eventParticipant.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Participante eliminado correctamente" });
  } catch (error) {
    return handleApiError(error);
  }
}
