import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";
import {
  generateAccreditationToken,
  generateAccreditationQrDataUrl,
  formatCodeNumber,
} from "@/lib/accreditation/token";
import { eventBus } from "@/lib/realtime/event-bus";

const publicRegistrationSchema = z.object({
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  documentNumber: z.string().min(1, "El número de documento es obligatorio"),
  documentType: z.enum(["CI", "PASSPORT", "DNI", "RUC"]).default("CI"),
  email: z.string().email("Correo electrónico inválido"),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  country: z.string().default("Paraguay"),
  city: z.string().optional().nullable(),
  accreditationTypeId: z.string().min(1, "Debes seleccionar una categoría"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code.trim().toUpperCase();

    const event = await prisma.event.findFirst({
      where: {
        code: cleanCode,
        status: { in: ["ACTIVE", "PUBLISHED", "DRAFT"] },
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        eventType: true,
        organizerName: true,
        locationName: true,
        address: true,
        startsAt: true,
        endsAt: true,
        timeSchedule: true,
        bannerUrl: true,
        logoUrl: true,
        maxCapacity: true,
        isPublicRegistration: true,
        accreditationTypes: {
          where: { active: true },
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            colorHex: true,
            textColorHex: true,
            maxAvailable: true,
            _count: { select: { participants: true } },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado o registro no disponible");
    }

    const categoriesWithQuotas = event.accreditationTypes.map((c) => {
      const isAvailable = !c.maxAvailable || c._count.participants < c.maxAvailable;
      const remaining = c.maxAvailable ? Math.max(0, c.maxAvailable - c._count.participants) : null;
      return {
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description,
        colorHex: c.colorHex,
        textColorHex: c.textColorHex,
        isAvailable,
        remaining,
      };
    });

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        accreditationTypes: categoriesWithQuotas,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const cleanCode = code.trim().toUpperCase();

    const event = await prisma.event.findUnique({
      where: { code: cleanCode },
      include: {
        accreditationTypes: true,
      },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    const body = await req.json();
    const parsed = publicRegistrationSchema.parse(body);

    // Verify category exists and has capacity
    const category = event.accreditationTypes.find(
      (c) => c.id === parsed.accreditationTypeId && c.active
    );
    if (!category) {
      throw new BadRequestError("Categoría de acreditación no válida o inactiva");
    }

    if (category.maxAvailable) {
      const currentParticipants = await prisma.eventParticipant.count({
        where: { eventId: event.id, accreditationTypeId: category.id },
      });
      if (currentParticipants >= category.maxAvailable) {
        throw new BadRequestError(`Lo sentimos, el cupo para la categoría "${category.name}" está agotado`);
      }
    }

    // Duplicate detection by documentNumber per event
    const cleanDoc = parsed.documentNumber.trim().toUpperCase();
    const existing = await prisma.eventParticipant.findUnique({
      where: {
        eventId_documentNumber: {
          eventId: event.id,
          documentNumber: cleanDoc,
        },
      },
      include: {
        accreditation: true,
      },
    });

    if (existing) {
      // If already registered, return their existing credential without error so they can retrieve their QR!
      if (existing.accreditation) {
        return NextResponse.json({
          success: true,
          alreadyRegistered: true,
          message: "Ya te encontrabas registrado previamente. Aquí tienes tu credencial de acceso:",
          participant: {
            id: existing.id,
            firstName: existing.firstName,
            lastName: existing.lastName,
            documentNumber: existing.documentNumber,
            documentType: existing.documentType,
            company: existing.company,
            jobTitle: existing.jobTitle,
          },
          accreditation: {
            codeNumber: existing.accreditation.codeNumber,
            qrCodeUrl: existing.accreditation.qrCodeUrl,
            status: existing.accreditation.status,
          },
          category: {
            name: category.name,
            code: category.code,
            colorHex: category.colorHex,
          },
          event: {
            name: event.name,
            code: event.code,
            locationName: event.locationName,
            startsAt: event.startsAt,
          },
        });
      }
      throw new BadRequestError("Ya existe un registro con este número de documento para este evento");
    }

    // Create participant
    const participant = await prisma.eventParticipant.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        firstName: parsed.firstName.trim(),
        lastName: parsed.lastName.trim(),
        documentNumber: cleanDoc,
        documentType: parsed.documentType,
        email: parsed.email.trim().toLowerCase(),
        company: parsed.company?.trim() || null,
        jobTitle: parsed.jobTitle?.trim() || null,
        phone: parsed.phone?.trim() || null,
        whatsapp: parsed.whatsapp?.trim() || null,
        country: parsed.country?.trim() || "Paraguay",
        city: parsed.city?.trim() || null,
        accreditationTypeId: parsed.accreditationTypeId,
      },
    });

    // Sequential code: e.g. TECH-GEN-0042
    const currentCount = await prisma.eventAccreditation.count({
      where: { eventId: event.id },
    });
    const codeNumber = formatCodeNumber(event.code, category.code, currentCount + 1);

    // Cryptographic Token & HMAC-SHA256 signature
    const { qrToken, qrSignature } = generateAccreditationToken(
      event.id,
      participant.id
    );

    // High-resolution Level H QR code Data URL
    const qrCodeUrl = await generateAccreditationQrDataUrl(qrToken);

    // Create Accreditation
    const accreditation = await prisma.eventAccreditation.create({
      data: {
        tenantId: event.tenantId,
        eventId: event.id,
        participantId: participant.id,
        accreditationTypeId: category.id,
        codeNumber,
        qrToken,
        qrSignature,
        qrCodeUrl,
        status: "APPROVED",
        issuedBy: "AUTO_REGISTRO_PUBLICO",
        issuedAt: new Date(),
      },
    });

    // Emit Realtime Event for admin dashboard
    eventBus.emit("ACCREDITATION_REGISTERED", {
      tenantId: event.tenantId,
      eventId: event.id,
      participantId: participant.id,
      codeNumber,
      categoryName: category.name,
    });

    return NextResponse.json(
      {
        success: true,
        alreadyRegistered: false,
        message: "¡Registro exitoso! Tu credencial de acceso ha sido generada.",
        participant: {
          id: participant.id,
          firstName: participant.firstName,
          lastName: participant.lastName,
          documentNumber: participant.documentNumber,
          documentType: participant.documentType,
          company: participant.company,
          jobTitle: participant.jobTitle,
        },
        accreditation: {
          codeNumber,
          qrCodeUrl,
          status: "APPROVED",
        },
        category: {
          name: category.name,
          code: category.code,
          colorHex: category.colorHex,
        },
        event: {
          name: event.name,
          code: event.code,
          locationName: event.locationName,
          address: event.address,
          startsAt: event.startsAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
