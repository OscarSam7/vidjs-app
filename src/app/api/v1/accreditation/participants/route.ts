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
import { eventBus } from "@/lib/realtime/event-bus";

const participantSchema = z.object({
  eventId: z.string().min(1, "El ID del evento es obligatorio"),
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  documentNumber: z.string().min(1, "El documento de identidad es obligatorio"),
  documentType: z.enum(["CI", "PASSPORT", "DNI", "RUC"]).default("CI"),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  country: z.string().default("Paraguay"),
  city: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  accreditationTypeId: z.string().min(1, "Debes seleccionar un tipo de acreditación"),
  organizationId: z.string().optional().nullable(),
  isSpecialGuest: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  status: z
    .enum(["PENDING", "APPROVED", "ACCREDITED", "CHECKED_IN", "REJECTED", "CANCELLED", "BLOCKED"])
    .default("APPROVED"),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const search = searchParams.get("search");
    const typeId = searchParams.get("typeId");
    const orgId = searchParams.get("orgId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!eventId) {
      throw new BadRequestError("Parámetro eventId es obligatorio");
    }

    const whereClause: any = {
      eventId,
      tenantId,
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { documentNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    if (typeId && typeId !== "ALL") {
      whereClause.accreditationTypeId = typeId;
    }

    if (orgId && orgId !== "ALL") {
      whereClause.organizationId = orgId;
    }

    if (status && status !== "ALL") {
      whereClause.accreditation = {
        status,
      };
    }

    const [total, participants] = await Promise.all([
      prisma.eventParticipant.count({ where: whereClause }),
      prisma.eventParticipant.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          accreditationType: {
            select: { id: true, name: true, code: true, colorHex: true, textColorHex: true },
          },
          organization: {
            select: { id: true, name: true },
          },
          accreditation: {
            select: {
              id: true,
              codeNumber: true,
              qrToken: true,
              qrCodeUrl: true,
              status: true,
              issuedAt: true,
              accreditedAt: true,
              printCount: true,
              totalCheckIns: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, session } = await requireTenantContext();
    await requirePermission("accreditations:manage");

    const body = await req.json();
    const parsed = participantSchema.parse(body);

    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: { id: parsed.eventId, tenantId },
      select: { id: true, code: true, maxCapacity: true },
    });
    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    // Verify category exists and has capacity
    const category = await prisma.accreditationType.findFirst({
      where: { id: parsed.accreditationTypeId, eventId: parsed.eventId, tenantId },
      include: { _count: { select: { participants: true } } },
    });
    if (!category) {
      throw new NotFoundError("Tipo de acreditación no encontrado");
    }

    if (category.maxAvailable && category._count.participants >= category.maxAvailable) {
      throw new BadRequestError(
        `El cupo máximo para la categoría "${category.name}" (${category.maxAvailable}) ha sido alcanzado`
      );
    }

    // Duplicate detection by documentNumber per event (Fase 3: Detección de duplicados)
    const cleanDoc = parsed.documentNumber.trim().toUpperCase();
    const existingDoc = await prisma.eventParticipant.findUnique({
      where: {
        eventId_documentNumber: {
          eventId: parsed.eventId,
          documentNumber: cleanDoc,
        },
      },
    });

    if (existingDoc) {
      throw new BadRequestError(
        `Ya existe un participante registrado con el documento '${cleanDoc}' (${existingDoc.firstName} ${existingDoc.lastName})`
      );
    }

    // Create participant
    const participant = await prisma.eventParticipant.create({
      data: {
        tenantId,
        eventId: parsed.eventId,
        firstName: parsed.firstName.trim(),
        lastName: parsed.lastName.trim(),
        documentNumber: cleanDoc,
        documentType: parsed.documentType,
        company: parsed.company?.trim() || null,
        jobTitle: parsed.jobTitle?.trim() || null,
        email: parsed.email.trim().toLowerCase(),
        phone: parsed.phone?.trim() || null,
        whatsapp: parsed.whatsapp?.trim() || null,
        country: parsed.country?.trim() || "Paraguay",
        city: parsed.city?.trim() || null,
        photoUrl: parsed.photoUrl?.trim() || null,
        accreditationTypeId: parsed.accreditationTypeId,
        organizationId: parsed.organizationId || null,
        isSpecialGuest: parsed.isSpecialGuest,
        notes: parsed.notes?.trim() || null,
      },
    });

    // Count existing accreditations in event to create human-readable code
    const countAcc = await prisma.eventAccreditation.count({
      where: { eventId: parsed.eventId },
    });
    const codeNumber = formatCodeNumber(event.code, category.code, countAcc + 1);

    // Cryptographic QR Token & HMAC SHA-256 signature
    const { qrToken, qrSignature } = generateAccreditationToken(
      parsed.eventId,
      participant.id
    );

    // Generate high-resolution Level H QR code Data URL
    const qrCodeUrl = await generateAccreditationQrDataUrl(qrToken);

    // Create Accreditation
    const accreditation = await prisma.eventAccreditation.create({
      data: {
        tenantId,
        eventId: parsed.eventId,
        participantId: participant.id,
        accreditationTypeId: parsed.accreditationTypeId,
        codeNumber,
        qrToken,
        qrSignature,
        qrCodeUrl,
        status: parsed.status,
        issuedBy: session.name || session.email,
        issuedAt: new Date(),
      },
    });

    // Emit Realtime Event
    eventBus.emit("ACCREDITATION_REGISTERED", {
      tenantId,
      eventId: parsed.eventId,
      participantId: participant.id,
      codeNumber,
      categoryName: category.name,
    });

    return NextResponse.json(
      {
        success: true,
        participant: {
          ...participant,
          accreditation,
          accreditationType: category,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
