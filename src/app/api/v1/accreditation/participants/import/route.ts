import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";
import {
  generateAccreditationToken,
  generateAccreditationQrDataUrl,
  formatCodeNumber,
} from "@/lib/accreditation/token";

const importRowSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  documentNumber: z.string().min(1, "Documento requerido"),
  documentType: z.enum(["CI", "PASSPORT", "DNI", "RUC"]).default("CI"),
  email: z.string().email("Email inválido"),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  categoryCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  country: z.string().default("Paraguay"),
  city: z.string().optional().nullable(),
  isSpecialGuest: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

const importPayloadSchema = z.object({
  eventId: z.string().min(1, "ID del evento requerido"),
  rows: z.array(importRowSchema).min(1, "El archivo debe contener al menos 1 fila de datos"),
  defaultAccreditationTypeId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { tenantId, session } = await requireTenantContext();
    await requirePermission("accreditations:manage");

    const body = await req.json();
    const parsed = importPayloadSchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: parsed.eventId, tenantId },
      include: {
        accreditationTypes: true,
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    if (event.accreditationTypes.length === 0) {
      throw new BadRequestError("El evento no tiene categorías de acreditación creadas");
    }

    // Map category codes / names to IDs
    const categoryMap = new Map<string, string>();
    for (const cat of event.accreditationTypes) {
      categoryMap.set(cat.code.toUpperCase(), cat.id);
      categoryMap.set(cat.name.toUpperCase(), cat.id);
    }

    const defaultTypeId =
      parsed.defaultAccreditationTypeId || event.accreditationTypes[0].id;

    // Fetch existing documents to detect duplicates
    const existingParticipants = await prisma.eventParticipant.findMany({
      where: { eventId: parsed.eventId, tenantId },
      select: { documentNumber: true, email: true },
    });

    const existingDocsSet = new Set(
      existingParticipants.map((p) => p.documentNumber.toUpperCase())
    );

    let importedCount = 0;
    let skippedDuplicatesCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Get current total accreditations for sequence numbers
    let currentSequence = await prisma.eventAccreditation.count({
      where: { eventId: parsed.eventId },
    });

    // Process rows sequentially to guarantee sequence numbers and prevent race conditions
    for (let i = 0; i < parsed.rows.length; i++) {
      const row = parsed.rows[i];
      const cleanDoc = row.documentNumber.trim().toUpperCase();

      if (existingDocsSet.has(cleanDoc)) {
        skippedDuplicatesCount++;
        continue;
      }

      // Resolve category
      let typeId = defaultTypeId;
      if (row.categoryCode) {
        const lookup = row.categoryCode.trim().toUpperCase();
        if (categoryMap.has(lookup)) {
          typeId = categoryMap.get(lookup)!;
        }
      }

      const categoryObj = event.accreditationTypes.find((c) => c.id === typeId)!;

      try {
        const participant = await prisma.eventParticipant.create({
          data: {
            tenantId,
            eventId: parsed.eventId,
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            documentNumber: cleanDoc,
            documentType: row.documentType,
            email: row.email.trim().toLowerCase(),
            company: row.company?.trim() || null,
            jobTitle: row.jobTitle?.trim() || null,
            phone: row.phone?.trim() || null,
            whatsapp: row.whatsapp?.trim() || null,
            country: row.country?.trim() || "Paraguay",
            city: row.city?.trim() || null,
            isSpecialGuest: row.isSpecialGuest,
            notes: row.notes?.trim() || null,
            accreditationTypeId: typeId,
          },
        });

        currentSequence++;
        const codeNumber = formatCodeNumber(event.code, categoryObj.code, currentSequence);
        const { qrToken, qrSignature } = generateAccreditationToken(
          parsed.eventId,
          participant.id
        );
        const qrCodeUrl = await generateAccreditationQrDataUrl(qrToken);

        await prisma.eventAccreditation.create({
          data: {
            tenantId,
            eventId: parsed.eventId,
            participantId: participant.id,
            accreditationTypeId: typeId,
            codeNumber,
            qrToken,
            qrSignature,
            qrCodeUrl,
            status: "APPROVED",
            issuedBy: session.name || session.email,
            issuedAt: new Date(),
          },
        });

        existingDocsSet.add(cleanDoc);
        importedCount++;
      } catch (err: any) {
        errors.push({
          row: i + 1,
          error: err.message || "Error al insertar fila",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: parsed.rows.length,
      importedCount,
      skippedDuplicatesCount,
      errorsCount: errors.length,
      errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
